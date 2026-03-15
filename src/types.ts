export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Housing' | 'Work' | 'Leisure' | 'Other';
  date: string;
}

export interface Project {
  id: string;
  title: string;
  content: string;
  status: 'Planning' | 'In Progress' | 'Completed';
  lastModified: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
