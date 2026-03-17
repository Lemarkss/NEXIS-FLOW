export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Comida' | 'Transporte' | 'Moradia' | 'Trabalho' | 'Lazer' | 'Outro';
  date: string;
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
}

export interface Project {
  id: string;
  title: string;
  content: string;
  status: 'Planejamento' | 'Em Progresso' | 'Concluído';
  lastModified: string;
  tasks?: Task[];
}

export type ChatTone = 'formal' | 'informal' | 'criativo';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
