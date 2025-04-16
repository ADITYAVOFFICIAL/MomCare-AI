// src/components/StackingGameFinal.tsx
// (Ensure filename matches if you changed it)
import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import * as THREE from 'three';
import { Button } from '@/components/ui/button'; // Assuming Shadcn UI is set up
import { Loader2, RefreshCw, Trophy } from 'lucide-react';

// --- Configuration Constants ---

// Game Mechanics
const BOX_HEIGHT = 1;                   // Height of each block
const INITIAL_BOX_SIZE = 3;             // Width/depth of the base block
const SWING_SPEED = 4.8;                // Units per second for the swinging block
const SWING_LIMIT_MULTIPLIER = 1.4;     // How far the block swings relative to its base size
const INITIAL_SWING_OFFSET_MULTIPLIER = 1.6; // How far out the block spawns initially
const DROP_ACCELERATION = 28;           // Gravity effect when dropping the active block (units/sec^2)
const DROP_INITIAL_VELOCITY = -0.5;     // Slight initial downward push when dropped
const PERFECT_MATCH_TOLERANCE = 0.12;   // Margin for a "perfect" drop (smaller is harder)
const MIN_OVERLAP_FOR_SUCCESS = 0.05;   // Minimum overlap required to not be game over
const PERFECT_MATCH_SCORE_BONUS = 2;    // Extra points for perfect match (total 1 + 2 = 3)
const BASE_SCORE_INCREMENT = 1;         // Points for a non-perfect successful drop

// Physics for Falling Pieces
const FALLING_BLOCK_GRAVITY = 20;       // Gravity for cut-off pieces (units/sec^2)
const FALLING_BLOCK_SPIN_STRENGTH = 1.0;// How much cut-off pieces spin (radians/sec)
const FALLING_BLOCK_SIDE_PUSH = 1.8;    // Slight horizontal push for cut-off pieces
const FALLING_BLOCK_CLEANUP_Y = -40;    // Y-level to remove falling blocks

// Camera
const CAMERA_FRUSTUM_SIZE = 18;         // Controls the zoom level (larger means more zoomed out)
const CAMERA_INITIAL_Y = 9;             // Initial camera height offset from base
const CAMERA_POSITION_X = 13;           // Camera horizontal position
const CAMERA_POSITION_Z = 13;           // Camera depth position
const CAMERA_LERP_FACTOR = 0.07;        // Smoothness of camera follow (smaller is smoother)

// Visuals & Style
const STACK_COLORS = [                  // Refined color palette
    0x55efc4, 0x81ecec, 0x74b9ff, 0xa29bfe, 0xdfe6e9,
    0xff7675, 0xfdcb6e, 0xfab1a0, 0xe17055, 0x00b894,
];
const BACKGROUND_COLOR = 0xEAF2F8;      // Lighter, slightly blue background
const GROUND_PLANE_COLOR = 0x1a1a1a;    // Muted ground color
const GROUND_PLANE_SIZE = 60;
const AMBIENT_LIGHT_INTENSITY = 0.75;
const DIRECTIONAL_LIGHT_INTENSITY = 1.0;
const DIRECTIONAL_LIGHT_POS = new THREE.Vector3(18, 35, 25);
const SHADOW_MAP_SIZE = 1024;           // Power of 2 (512, 1024, 2048)

// --- Type Definitions ---
interface StackBlock {
    mesh: THREE.Mesh;
    size: THREE.Vector3;
    position: THREE.Vector3;
}

interface FallingBlock extends THREE.Mesh {
    userData: {
        velocity: THREE.Vector3;
        angularVelocity: THREE.Vector3;
    };
}

interface GameInstance {
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    renderer: THREE.WebGLRenderer;
    clock: THREE.Clock;
    ambientLight: THREE.AmbientLight;
    directionalLight: THREE.DirectionalLight;
    groundPlane: THREE.Mesh;
    stack: StackBlock[];
    fallingBlocks: FallingBlock[];
    activeBlock: THREE.Mesh | null;
    activeBlockVelocityY: number;
    gamePhase: 'loading' | 'swinging' | 'dropping' | 'gameOver';
    swingAxis: 'x' | 'z';
    swingDirection: number;
    swingLimit: number;
    cameraTargetY: number;
    animationFrameId?: number;
    lastBlock?: StackBlock;
    isMounted: boolean;
}

// --- Component Props ---
interface StackingGameProps {
    onGameOver: (score: number) => void;
    disabled?: boolean;
}

// --- The React Component ---
const StackingGameFinal: React.FC<StackingGameProps> = memo(({ onGameOver, disabled = false }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const gameInstance = useRef<GameInstance | null>(null);

    const [isGameOver, setIsGameOver] = useState<boolean>(false);
    const [score, setScore] = useState<number>(0);
    const scoreRef = useRef<number>(score); // Ref to track current score
    const [showInstructions, setShowInstructions] = useState<boolean>(true);
    useEffect(() => {
        scoreRef.current = score;
    }, [score]);

    // --- Utility: Dispose Three.js Object ---
    const disposeObject = (obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        }
    };

    // --- Core Game Logic Functions ---

    const createBlockMesh = useCallback((width: number, depth: number, color: THREE.ColorRepresentation): THREE.Mesh => {
        const geometry = new THREE.BoxGeometry(width, BOX_HEIGHT, depth);
        const material = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }, []);

    const addBlock = useCallback((x: number, z: number, width: number, depth: number, isFalling = false): THREE.Mesh | null => {
        if (!gameInstance.current) { /*console.error("AddBlock: Game instance not ready.");*/ return null; }
        const { scene, stack } = gameInstance.current;
        const stackIndex = stack.length;
        const y = BOX_HEIGHT * stackIndex;
        const color = STACK_COLORS[stackIndex % STACK_COLORS.length];
        const mesh = createBlockMesh(width, depth, color);
        mesh.position.set(x, y, z);
        scene.add(mesh);

        if (!isFalling) {
            const newBlockData: StackBlock = { mesh, size: new THREE.Vector3(width, BOX_HEIGHT, depth), position: mesh.position.clone() };
            stack.push(newBlockData);
            gameInstance.current.lastBlock = newBlockData;
            gameInstance.current.cameraTargetY = mesh.position.y + CAMERA_INITIAL_Y;
            gameInstance.current.swingLimit = (gameInstance.current.swingAxis === 'x' ? width : depth) * SWING_LIMIT_MULTIPLIER;
        } else {
            const fallingMesh = mesh as FallingBlock;
            // FIX: Initialize userData with the required structure directly
            fallingMesh.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * FALLING_BLOCK_SIDE_PUSH * 2,
                    (Math.random() * -0.5) - 0.1, // Initial downward velocity slightly randomized
                    (Math.random() - 0.5) * FALLING_BLOCK_SIDE_PUSH * 2
                ),
                angularVelocity: new THREE.Vector3(
                    (Math.random() - 0.5) * FALLING_BLOCK_SPIN_STRENGTH * 2,
                    (Math.random() - 0.5) * FALLING_BLOCK_SPIN_STRENGTH * 2,
                    (Math.random() - 0.5) * FALLING_BLOCK_SPIN_STRENGTH * 2
                )
            };
            gameInstance.current.fallingBlocks.push(fallingMesh);
        }
        return mesh;
    }, [createBlockMesh]);

    const spawnNewActiveBlock = useCallback(() => {
        if (!gameInstance.current || gameInstance.current.gamePhase === 'gameOver' || !gameInstance.current.lastBlock) return;
        const { lastBlock, swingAxis, swingDirection, scene } = gameInstance.current;
        const { size, position } = lastBlock;
        const newWidth = size.x; const newDepth = size.z;
        const newY = position.y + BOX_HEIGHT;
        const stackIndex = gameInstance.current.stack.length;
        const color = STACK_COLORS[stackIndex % STACK_COLORS.length];
        const newBlockMesh = createBlockMesh(newWidth, newDepth, color);
        const initialOffset = (swingAxis === 'x' ? newWidth : newDepth) * INITIAL_SWING_OFFSET_MULTIPLIER;
        const startX = (swingAxis === 'x') ? position.x + initialOffset * swingDirection : position.x;
        const startZ = (swingAxis === 'z') ? position.z + initialOffset * swingDirection : position.z;
        newBlockMesh.position.set(startX, newY + BOX_HEIGHT * 0.2, startZ);
        scene.add(newBlockMesh);
        gameInstance.current.activeBlock = newBlockMesh;
        gameInstance.current.activeBlockVelocityY = 0;
        gameInstance.current.swingLimit = (swingAxis === 'x' ? newWidth : newDepth) * SWING_LIMIT_MULTIPLIER;
        gameInstance.current.gamePhase = 'swinging';
        setShowInstructions(false);
    }, [addBlock, createBlockMesh]);


    // IMPORTANT FIX: Define animate BEFORE resetGame
    const animate = useCallback(() => {
        if (!gameInstance.current || !gameInstance.current.isMounted) return;

        gameInstance.current.animationFrameId = requestAnimationFrame(animate);

        const {
            scene, camera, renderer, clock, activeBlock, gamePhase, swingAxis,
            swingDirection, swingLimit, stack, lastBlock, fallingBlocks, cameraTargetY,
        } = gameInstance.current;

        const delta = clock.getDelta();
        const clampedDelta = Math.min(delta, 0.05);

        if (gamePhase !== 'gameOver') {
            // Swinging Logic
            if (gamePhase === 'swinging' && activeBlock && lastBlock) {
                const currentPos = activeBlock.position; const basePos = lastBlock.position;
                if (swingAxis === 'x') {
                    currentPos.x += swingDirection * SWING_SPEED * clampedDelta;
                    if (Math.abs(currentPos.x - basePos.x) >= swingLimit) {
                        currentPos.x = basePos.x + swingLimit * swingDirection; gameInstance.current.swingDirection *= -1;
                    }
                } else {
                    currentPos.z += swingDirection * SWING_SPEED * clampedDelta;
                    if (Math.abs(currentPos.z - basePos.z) >= swingLimit) {
                        currentPos.z = basePos.z + swingLimit * swingDirection; gameInstance.current.swingDirection *= -1;
                    }
                }
            }

            // Dropping Logic
            if (gamePhase === 'dropping' && activeBlock && lastBlock) {
                const targetY = lastBlock.position.y + BOX_HEIGHT;
                gameInstance.current.activeBlockVelocityY -= DROP_ACCELERATION * clampedDelta;
                activeBlock.position.y += gameInstance.current.activeBlockVelocityY * clampedDelta;

                if (activeBlock.position.y <= targetY) {
                    activeBlock.position.y = targetY;
                    const currentSize = lastBlock.size; const currentPos = lastBlock.position;
                    const droppedPos = activeBlock.position;
                    const droppedGeoParams = (activeBlock.geometry as THREE.BoxGeometry).parameters;
                    const droppedWidth = droppedGeoParams.width; const droppedDepth = droppedGeoParams.depth;
                    let overlap = 0, deltaPos = 0, checkAxis: 'x' | 'z', newWidth: number, newDepth: number;

                    if (swingAxis === 'x') {
                        checkAxis = 'x'; deltaPos = droppedPos.x - currentPos.x;
                        overlap = (currentSize.x / 2) + (droppedWidth / 2) - Math.abs(deltaPos);
                        newWidth = Math.max(0, overlap); newDepth = currentSize.z;
                    } else {
                        checkAxis = 'z'; deltaPos = droppedPos.z - currentPos.z;
                        overlap = (currentSize.z / 2) + (droppedDepth / 2) - Math.abs(deltaPos);
                        newWidth = currentSize.x; newDepth = Math.max(0, overlap);
                    }

                    if (overlap < MIN_OVERLAP_FOR_SUCCESS) {
                        // Use scoreRef.current to get the latest score
                        // console.log(`Game Over - Missed! Overlap: ${overlap.toFixed(3)} Score: ${scoreRef.current}`);
                        scene.remove(activeBlock); disposeObject(activeBlock);
                        addBlock(droppedPos.x, droppedPos.z, droppedWidth, droppedDepth, true);
                        gameInstance.current.activeBlock = null;
                        gameInstance.current.gamePhase = 'gameOver';
                        setIsGameOver(true);
                        // Pass the latest score from the ref
                        onGameOver(scoreRef.current);
                    } else {
                        const isPerfect = overlap > (checkAxis === 'x' ? currentSize.x : currentSize.z) - PERFECT_MATCH_TOLERANCE;
                        let scoreIncrement = BASE_SCORE_INCREMENT;
                        scene.remove(activeBlock); disposeObject(activeBlock); gameInstance.current.activeBlock = null;

                        if (isPerfect) {
                            // console.log("Perfect Match!"); scoreIncrement += PERFECT_MATCH_SCORE_BONUS;
                            addBlock(currentPos.x, currentPos.z, currentSize.x, currentSize.z);
                        } else {
                            const stackedX = checkAxis === 'x' ? currentPos.x + deltaPos / 2 : currentPos.x;
                            const stackedZ = checkAxis === 'z' ? currentPos.z + deltaPos / 2 : currentPos.z;
                            addBlock(stackedX, stackedZ, newWidth, newDepth);
                            const cutSize = (checkAxis === 'x' ? droppedWidth : droppedDepth) - overlap;
                            if (cutSize > 1e-6) {
                                const cutShift = overlap / 2 + cutSize / 2;
                                const fallingX = checkAxis === 'x' ? stackedX + (deltaPos > 0 ? cutShift : -cutShift) : stackedX;
                                const fallingZ = checkAxis === 'z' ? stackedZ + (deltaPos > 0 ? cutShift : -cutShift) : stackedZ;
                                const fallingWidth = checkAxis === 'x' ? cutSize : newWidth;
                                const fallingDepth = checkAxis === 'z' ? cutSize : newDepth;
                                addBlock(fallingX, fallingZ, fallingWidth, fallingDepth, true);
                            }
                        }
                        setScore(prev => prev + scoreIncrement);
                        gameInstance.current.swingAxis = swingAxis === 'x' ? 'z' : 'x';
                        gameInstance.current.swingDirection = Math.random() < 0.5 ? 1 : -1;
                        spawnNewActiveBlock();
                    }
                }
            }
        }

        // Animate Falling Blocks
        for (let i = fallingBlocks.length - 1; i >= 0; i--) {
            const block = fallingBlocks[i];
            block.userData.velocity = block.userData.velocity || new THREE.Vector3();
            block.userData.angularVelocity = block.userData.angularVelocity || new THREE.Vector3();
            block.userData.velocity.y -= FALLING_BLOCK_GRAVITY * clampedDelta;
            block.position.add(block.userData.velocity.clone().multiplyScalar(clampedDelta));
            block.rotation.x += block.userData.angularVelocity.x * clampedDelta;
            block.rotation.y += block.userData.angularVelocity.y * clampedDelta;
            block.rotation.z += block.userData.angularVelocity.z * clampedDelta;
            if (block.position.y < FALLING_BLOCK_CLEANUP_Y) {
                scene.remove(block); disposeObject(block); fallingBlocks.splice(i, 1);
            }
        }

        // Camera Movement
        camera.position.y += (cameraTargetY - camera.position.y) * CAMERA_LERP_FACTOR;
        const lookAtY = stack.length > 0 ? stack.length * BOX_HEIGHT / 2 : BOX_HEIGHT / 2;
        camera.lookAt(0, lookAtY, 0);

        // Render
        try { renderer.render(scene, camera); }
        catch (error) {
            // console.error("Render error:", error);
            if (gameInstance.current?.animationFrameId) cancelAnimationFrame(gameInstance.current.animationFrameId);
            gameInstance.current.animationFrameId = undefined; // Stop loop on render error
        }
    // FIX: Remove score from dependency array to prevent stale closure
}, [addBlock, spawnNewActiveBlock, onGameOver, createBlockMesh]); // score is NOT needed here


    // IMPORTANT FIX: Define resetGame AFTER animate
    const resetGame = useCallback(() => {
        if (!gameInstance.current || !mountRef.current) { /*console.error("Reset: Game instance not ready.");*/ return; }
        // console.log("Resetting game...");
        if (gameInstance.current.animationFrameId) cancelAnimationFrame(gameInstance.current.animationFrameId);
        gameInstance.current.animationFrameId = undefined;

        const scene = gameInstance.current.scene;
        while (scene.children.length > 0) {
            const obj = scene.children[0]; scene.remove(obj); disposeObject(obj);
        }

        gameInstance.current.stack = []; gameInstance.current.fallingBlocks = [];
        gameInstance.current.activeBlock = null; gameInstance.current.gamePhase = 'loading';
        gameInstance.current.swingAxis = 'x'; gameInstance.current.swingDirection = Math.random() < 0.5 ? 1 : -1;
        gameInstance.current.cameraTargetY = CAMERA_INITIAL_Y; gameInstance.current.lastBlock = undefined;
        gameInstance.current.clock.stop();

        setScore(0); setIsGameOver(false); setShowInstructions(true);

        scene.add(gameInstance.current.ambientLight); scene.add(gameInstance.current.directionalLight);
        scene.add(gameInstance.current.groundPlane);

        const baseMesh = addBlock(0, 0, INITIAL_BOX_SIZE, INITIAL_BOX_SIZE);
        if (baseMesh && gameInstance.current.stack.length > 0) {
            baseMesh.position.y = 0; gameInstance.current.lastBlock = gameInstance.current.stack[0];
            gameInstance.current.camera.position.y = gameInstance.current.cameraTargetY;
            gameInstance.current.camera.lookAt(0, BOX_HEIGHT / 2, 0);
        } else { /*console.error("Failed to create base block during reset!");*/ return; }

        setTimeout(() => {
            if (gameInstance.current && gameInstance.current.isMounted && gameInstance.current.gamePhase !== 'gameOver') {
                gameInstance.current.clock.start();
                spawnNewActiveBlock();
                // Call the globally defined animate function
                animate();
            }
        }, 200);
    // IMPORTANT FIX: Remove 'animate' from dependencies
    }, [addBlock, spawnNewActiveBlock]);


    // --- Initialize Three.js Effect (Runs once on mount) ---
    useEffect(() => {
        if (!mountRef.current || gameInstance.current) return;
        const currentMount = mountRef.current;
        const instance: Partial<GameInstance> = { isMounted: true };
        // console.log("Initializing Three.js...");

        try {
            const { clientWidth: width, clientHeight: height } = currentMount;
            instance.scene = new THREE.Scene();
            instance.scene.background = new THREE.Color(BACKGROUND_COLOR);
            const aspect = width / height;
            instance.camera = new THREE.OrthographicCamera(
                CAMERA_FRUSTUM_SIZE * aspect / -2, CAMERA_FRUSTUM_SIZE * aspect / 2, CAMERA_FRUSTUM_SIZE / 2, CAMERA_FRUSTUM_SIZE / -2, 0.1, 1000
            );
            instance.camera.position.set(CAMERA_POSITION_X, CAMERA_INITIAL_Y, CAMERA_POSITION_Z);
            instance.camera.lookAt(0, 0, 0); instance.scene.add(instance.camera);
            instance.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            instance.renderer.setSize(width, height); instance.renderer.setPixelRatio(window.devicePixelRatio);
            instance.renderer.shadowMap.enabled = true; instance.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            currentMount.appendChild(instance.renderer.domElement);
            instance.ambientLight = new THREE.AmbientLight(0xffffff, AMBIENT_LIGHT_INTENSITY);
            instance.scene.add(instance.ambientLight);
            instance.directionalLight = new THREE.DirectionalLight(0xffffff, DIRECTIONAL_LIGHT_INTENSITY);
            instance.directionalLight.position.copy(DIRECTIONAL_LIGHT_POS); instance.directionalLight.castShadow = true;
            instance.directionalLight.shadow.camera.left = -30; instance.directionalLight.shadow.camera.right = 30;
            instance.directionalLight.shadow.camera.top = 30; instance.directionalLight.shadow.camera.bottom = -30;
            instance.directionalLight.shadow.camera.near = 1; instance.directionalLight.shadow.camera.far = 100;
            instance.directionalLight.shadow.mapSize.width = SHADOW_MAP_SIZE; instance.directionalLight.shadow.mapSize.height = SHADOW_MAP_SIZE;
            instance.scene.add(instance.directionalLight);
            const groundGeometry = new THREE.PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE);
            const groundMaterial = new THREE.MeshStandardMaterial({ color: GROUND_PLANE_COLOR, roughness: 0.9 });
            instance.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
            instance.groundPlane.rotation.x = -Math.PI / 2; instance.groundPlane.position.y = -BOX_HEIGHT * 0.01;
            instance.groundPlane.receiveShadow = true; instance.scene.add(instance.groundPlane);
            instance.clock = new THREE.Clock(false); instance.stack = []; instance.fallingBlocks = [];
            instance.activeBlock = null; instance.activeBlockVelocityY = 0; instance.gamePhase = 'loading';
            instance.swingAxis = 'x'; instance.swingDirection = Math.random() < 0.5 ? 1 : -1;
            instance.swingLimit = INITIAL_BOX_SIZE * SWING_LIMIT_MULTIPLIER; instance.cameraTargetY = CAMERA_INITIAL_Y;
            instance.animationFrameId = undefined; instance.lastBlock = undefined;
            gameInstance.current = instance as GameInstance;

            resetGame(); // Setup initial state and start game loop

            const handleResize = () => {
                if (!gameInstance.current || !mountRef.current) return;
                const { clientWidth: newWidth, clientHeight: newHeight } = mountRef.current;
                const { camera: cam, renderer: rend } = gameInstance.current;
                const newAspect = newWidth / newHeight;
                cam.left = CAMERA_FRUSTUM_SIZE * newAspect / -2; cam.right = CAMERA_FRUSTUM_SIZE * newAspect / 2;
                cam.top = CAMERA_FRUSTUM_SIZE / 2; cam.bottom = CAMERA_FRUSTUM_SIZE / -2;
                cam.updateProjectionMatrix(); rend.setSize(newWidth, newHeight);
            };
            window.addEventListener('resize', handleResize);

            return () => { // Cleanup
                // console.log("Cleaning up Three.js instance...");
                instance.isMounted = false; window.removeEventListener('resize', handleResize);
                if (gameInstance.current) {
                    if (gameInstance.current.animationFrameId) cancelAnimationFrame(gameInstance.current.animationFrameId);
                    gameInstance.current.scene.traverse(disposeObject);
                    gameInstance.current.stack = []; gameInstance.current.fallingBlocks = []; gameInstance.current.activeBlock = null;
                    gameInstance.current.renderer.dispose();
                    if (currentMount && gameInstance.current.renderer.domElement && currentMount.contains(gameInstance.current.renderer.domElement)) {
                        currentMount.removeChild(gameInstance.current.renderer.domElement);
                    }
                }
                gameInstance.current = null;
            };
        } catch (error) { /*console.error("Three.js Initialization Error:", error);*/ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount effect

    // --- Event Handlers ---
    const handleClick = useCallback(() => {
        if (!gameInstance.current || disabled || isGameOver || gameInstance.current.gamePhase !== 'swinging') return;
        gameInstance.current.gamePhase = 'dropping';
        gameInstance.current.activeBlockVelocityY = DROP_INITIAL_VELOCITY;
    }, [disabled, isGameOver]);

    const handleRestart = useCallback(() => {
        if (!gameInstance.current) { /*console.error("Cannot restart: No game instance.");*/ return; }
        resetGame();
    }, [resetGame]);

    // --- Component Render ---
    return (
        <div
            className="stacking-game-wrapper relative h-full w-full select-none bg-gradient-to-b from-sky-100 via-sky-200 to-blue-300 dark:from-gray-800 dark:via-gray-900 dark:to-black cursor-pointer overflow-hidden"
            onClick={handleClick} role="button" tabIndex={disabled || isGameOver ? -1 : 0}
            aria-label={isGameOver ? "Game Over - Press Play Again" : disabled ? "Game Disabled" : "Stacking Game Area - Click or Tap to drop block"}
        >
            <div ref={mountRef} className="stacking-game-canvas-container h-full w-full" style={{ minHeight: '450px' }} />
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
                <div className="z-10 self-start">
                     <div className="bg-white/80 dark:bg-black/70 backdrop-blur-sm text-gray-900 dark:text-white px-5 py-2 rounded-full text-xl md:text-2xl font-bold shadow-lg inline-block transition-opacity duration-300"
                          style={{ opacity: isGameOver ? 0.5 : 1 }}>
                         Score: <span className="font-mono tabular-nums tracking-wider">{score}</span>
                     </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    {showInstructions && !isGameOver && !disabled && (
                        <div className="bg-black/40 text-white p-4 md:p-6 rounded-lg shadow-xl text-center pointer-events-none animate-pulse">
                            <p className="text-2xl md:text-3xl font-semibold drop-shadow-md">Click / Tap to Drop!</p>
                        </div>
                    )}
                    {isGameOver && (
                        <div className="bg-gradient-to-br from-red-500/80 via-red-600/85 to-orange-600/80 backdrop-blur-md flex flex-col items-center justify-center text-white z-20 p-6 md:p-10 rounded-xl shadow-2xl pointer-events-auto w-full max-w-md mx-auto">
                            <Trophy className="w-20 h-20 md:w-24 md:h-24 text-yellow-300 mb-5 md:mb-6 drop-shadow-lg" />
                            <h2 className="text-4xl md:text-5xl font-bold mb-3 md:mb-4 drop-shadow-md">Game Over!</h2>
                            <p className="text-2xl md:text-3xl mb-8 md:mb-10 drop-shadow-sm">Final Score: <span className="font-bold">{score}</span></p>
                            <Button onClick={handleRestart} variant="secondary" size="lg" className="bg-white text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 shadow-xl text-lg md:text-xl px-8 py-3 md:py-4 pointer-events-auto rounded-lg transition-transform hover:scale-105">
                                <RefreshCw className="mr-2 md:mr-3 h-6 w-6 md:h-7 md:w-7" /> Play Again?
                            </Button>
                        </div>
                    )}
                     {disabled && !isGameOver && (
                         <div className="bg-slate-800/70 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20 p-6 rounded-lg shadow-lg pointer-events-none">
                             <Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin mb-4 md:mb-5" />
                             <p className="text-xl md:text-2xl font-semibold">Submitting...</p>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
});

export default StackingGameFinal;