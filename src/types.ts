export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  instructor: string;
  category: string;
  image_url: string;
  date_info: string;
  location: string;
  tag?: string;
}

export interface Registration {
  id?: string;
  course_id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  created_at?: string;
  status: 'pending' | 'confirmed';
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  tag?: string;
}

export interface Note {
  id?: string;
  user_id: string;
  title: string;
  content: string;
  course_name?: string;
  created_at?: string;
}

export interface AlbumItem {
  id?: string;
  user_id: string;
  image_url: string;
  caption: string;
  course_name?: string;
  created_at?: string;
}

export interface Favorite {
  id?: string;
  user_id: string;
  course_id: string;
  created_at?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}
