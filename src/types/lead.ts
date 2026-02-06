export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  location?: string;
  linkedin?: string;
  phone?: string;
  status: 'new' | 'contacted' | 'responded' | 'qualified' | 'replied' | 'unqualified' | 'lost';
  lastContact?: string | null;
  score: number;
  createdAt: string;
  tags?: string[];
  notes?: string;
  profile_data?: any;
  profileData?: any; // Alias for UI components
}

export interface Campaign {
  id?: string;
  name: string;
  status?: 'draft' | 'active' | 'paused' | 'completed';
  sent_count?: number;
  reply_count?: number;
  created_at?: string;
  updated_at?: string;
}
