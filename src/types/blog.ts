
import { Models } from 'appwrite';

export interface BlogPost extends Models.Document {
  title: string;
  content: string;
  author: string;
  category?: string;
  imageUrl?: string;
  tags?: string[];
  publishedAt?: string;
}
