import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { 
  LayoutDashboard, 
  Wallet, 
  Briefcase, 
  MessageSquare, 
  Calculator as CalcIcon, 
  Plus, 
  Trash2, 
  Send, 
  ChevronRight,
  TrendingUp,
  PieChart,
  Calendar,
  Search,
  Settings,
  Bell,
  User as UserIcon,
  X,
  ListTodo,
  CheckCircle2,
  Circle,
  Camera,
  CreditCard,
  Loader2,
  Sparkles,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Project, ChatMessage, ChatTone, Task } from './types';
import { getChatResponse, scanReceipt } from './services/geminiService';
import Calculator from './components/Calculator';
import { auth, db, googleProvider } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  getDoc,
  getDocFromServer
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: any;
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'premium' | 'admin'>('user');
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'projects' | 'chat' | 'calculator'>('dashboard');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgetGoal, setBudgetGoal] = useState(5000);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatTone, setChatTone] = useState<ChatTone>('formal');
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'Outro', amount: 0, description: '' });
  const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', content: '', status: 'Planejamento' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminConfig, setAdminConfig] = useState({ secretKey: '', appUrl: window.location.origin });

  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    setError("Ocorreu um erro de permissão ou conexão com o banco de dados.");
  };

  // Auth Listener
  useEffect(() => {
    console.log("Iniciando listener de autenticação...");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Estado de autenticação alterado:", currentUser?.email || "Deslogado");
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Check for payment success in URL
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userDoc = await getDoc(userRef);
          let currentRole: 'user' | 'premium' | 'admin' = 'user';

          if (!userDoc.exists()) {
            await setDoc(userRef, {
              displayName: currentUser.displayName || 'Usuário',
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              role: 'user',
              budgetGoal: 5000
            });
          } else {
            const data = userDoc.data();
            currentRole = data.role || 'user';
            setBudgetGoal(data.budgetGoal || 5000);
          }

          // If payment was successful, upgrade role
          if (paymentStatus === 'success' && currentRole === 'user') {
            await updateDoc(userRef, { role: 'premium' });
            currentRole = 'premium';
            // Clear URL params without reload
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          
          setUserRole(currentRole);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync Expenses
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const path = `users/${user.uid}/expenses`;
    const q = query(collection(db, path), orderBy('date', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Sync Projects
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const path = `users/${user.uid}/projects`;
    const q = query(collection(db, path), orderBy('lastModified', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Test Connection on boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
          setError("O banco de dados parece estar offline. Verifique sua conexão.");
        }
      }
    }
    testConnection();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Erro ao fazer login:", err);
      setError("Falha na autenticação com o Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setExpenses([]);
      setProjects([]);
      setChatHistory([]);
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  };

  const addExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !user) return;
    const path = `users/${user.uid}/expenses`;
    try {
      await addDoc(collection(db, path), {
        description: newExpense.description,
        amount: Number(newExpense.amount),
        category: newExpense.category as any,
        date: new Date().toISOString().split('T')[0],
        uid: user.uid
      });
      setNewExpense({ category: 'Outro', amount: 0, description: '' });
      setIsAddingExpense(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const addProject = async () => {
    if (!newProject.title || !newProject.content || !user) return;
    const path = `users/${user.uid}/projects`;
    try {
      await addDoc(collection(db, path), {
        title: newProject.title,
        content: newProject.content,
        status: newProject.status as any,
        lastModified: new Date().toISOString(),
        tasks: [],
        uid: user.uid
      });
      setNewProject({ title: '', content: '', status: 'Planejamento' });
      setIsAddingProject(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const addTask = async (projectId: string) => {
    if (!newTaskText.trim() || !user) return;
    const path = `users/${user.uid}/projects/${projectId}`;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTaskText,
      completed: false
    };

    try {
      await updateDoc(doc(db, path), {
        tasks: [...(project.tasks || []), newTask],
        lastModified: new Date().toISOString()
      });
      setNewTaskText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const toggleTask = async (projectId: string, taskId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/projects/${projectId}`;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedTasks = project.tasks?.map(t => 
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );

    try {
      await updateDoc(doc(db, path), {
        tasks: updatedTasks,
        lastModified: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteTask = async (projectId: string, taskId: string) => {
    if (!user) return;
    const path = `users/${user.uid}/projects/${projectId}`;
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const updatedTasks = project.tasks?.filter(t => t.id !== taskId);

    try {
      await updateDoc(doc(db, path), {
        tasks: updatedTasks,
        lastModified: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const deleteExpense = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/expenses/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const deleteProject = async (id: string) => {
    if (!user) return;
    const path = `users/${user.uid}/projects/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  };

  const updateBudgetGoal = async (newGoal: number) => {
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, path), { budgetGoal: newGoal });
      setBudgetGoal(newGoal);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const currentInput = chatInput;
    const userMsg: ChatMessage = { role: 'user', text: currentInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await getChatResponse(chatHistory, currentInput, { expenses, projects }, chatTone);
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Estou com problemas para me conectar agora. Por favor, tente novamente." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsScanning(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const data = await scanReceipt(base64);
        
        if (data.amount) {
          const path = `users/${user.uid}/expenses`;
          try {
            await addDoc(collection(db, path), {
              description: data.description || 'Recibo Digitalizado',
              amount: data.amount,
              category: (data.category as any) || 'Outro',
              date: data.date || new Date().toISOString().split('T')[0],
              uid: user.uid
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, path);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Erro ao escanear:", error);
    } finally {
      setIsScanning(false);
    }
  };

  // Carregar config de admin se for o admin
  useEffect(() => {
    if (user?.email === 'lemarksss321@gmail.com') {
      const loadConfig = async () => {
        const docRef = doc(db, 'config', 'stripe');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setAdminConfig(docSnap.data() as any);
        }
      };
      loadConfig();
    }
  }, [user]);

  const saveAdminConfig = async () => {
    try {
      await setDoc(doc(db, 'config', 'stripe'), adminConfig);
      alert("Configurações salvas com sucesso! Reiniciando o servidor...");
      setIsAdminModalOpen(false);
    } catch (error) {
      console.error("Erro ao salvar config:", error);
      alert("Erro ao salvar. Verifique as permissões.");
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError(null);
    setPaymentUrl(null);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar sessão de checkout");
      }

      if (data.url) {
        setPaymentUrl(data.url);
        // Tenta abrir em nova aba
        const win = window.open(data.url, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          // Se falhar, o modal de "Pagamento Pronto" já vai aparecer porque setPaymentUrl foi chamado
          console.log("Popup bloqueado, mostrando modal de fallback.");
        }
      }
    } catch (error: any) {
      console.error("Erro no checkout:", error);
      
      // Em ambiente de desenvolvimento/build, se houver qualquer erro no checkout real,
      // oferecemos o modo demo para não bloquear o usuário.
      setShowDemoModal(true);
      
      // Log detalhado para debug
      if (error.message) {
        console.log("Detalhes do erro:", error.message);
      }
    } finally {
      setIsUpgrading(false);
    }
  };

  const activateDemoPremium = async () => {
    if (!user) return;
    setIsUpgrading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        role: 'premium',
        lastUpgrade: new Date().toISOString()
      });
      setUserRole('premium');
      setShowDemoModal(false);
      setError(null);
    } catch (e: any) {
      console.error("Erro ao ativar modo demo:", e);
      setError("Não foi possível ativar o modo premium. Verifique sua conexão.");
    } finally {
      setIsUpgrading(false);
    }
  };

  // Prepare data for charts
  const chartData = expenses.reduce((acc: any[], exp) => {
    const date = exp.date;
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.amount += exp.amount;
    } else {
      acc.push({ date, amount: exp.amount });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const categoryData = expenses.reduce((acc: any[], exp) => {
    const existing = acc.find(d => d.name === exp.category);
    if (existing) {
      existing.value += exp.amount;
    } else {
      acc.push({ name: exp.category, value: exp.amount });
    }
    return acc;
  }, []);

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

  const SidebarItem = ({ id, icon: Icon, label, color }: { id: typeof activeTab, icon: any, label: string, color: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 shrink-0 md:w-full px-4 py-3 rounded-2xl transition-all duration-300 group ${
        activeTab === id 
          ? `bg-gradient-to-r ${color} text-white shadow-lg shadow-black/40 scale-[1.02]` 
          : 'text-zinc-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`p-2 rounded-xl transition-colors ${activeTab === id ? 'bg-white/20' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
        <Icon size={18} />
      </div>
      <span className="font-semibold text-sm tracking-wide">{label}</span>
    </button>
  );

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -z-10"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-zinc-900/50 backdrop-blur-2xl border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/20 rotate-3">
            <TrendingUp size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter mb-4">NEXIS FLOW</h1>
          <p className="text-zinc-400 font-medium mb-10 leading-relaxed">
            Sua central inteligente de gestão financeira e projetos. Entre para sincronizar seus dados na nuvem.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-4 bg-white text-black font-black py-5 rounded-2xl hover:scale-[1.02] transition-all shadow-xl"
          >
            <LogIn size={20} />
            ENTRAR COM GOOGLE
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col md:flex-row">
      {/* Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-red-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-xl"
          >
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors"><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Success/Blocked Overlay */}
      <AnimatePresence>
        {paymentUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[3rem] max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard size={40} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Pagamento Pronto!</h3>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                A janela de pagamento foi preparada. Clique no botão abaixo para concluir seu upgrade com segurança.
              </p>
              <div className="space-y-3">
                <a 
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl transition-all shadow-lg shadow-emerald-500/20"
                  onClick={() => setPaymentUrl(null)}
                >
                  ABRIR PÁGINA DE PAGAMENTO
                </a>
                <button 
                  onClick={() => setPaymentUrl(null)}
                  className="block w-full py-4 text-zinc-500 hover:text-white font-bold transition-colors"
                >
                  Voltar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo Upgrade Modal */}
      <AnimatePresence>
        {showDemoModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-[3rem] max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles size={40} className="text-amber-500" />
              </div>
              <h3 className="text-2xl font-black mb-4 tracking-tight">Modo de Teste</h3>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                O sistema de pagamento real (Stripe) não está configurado. Deseja ativar o <b>Modo Premium Grátis</b> para testar todas as funcionalidades agora?
              </p>
              <div className="space-y-3">
                <button 
                  onClick={activateDemoPremium}
                  className="block w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl transition-all shadow-lg shadow-amber-500/20"
                >
                  ATIVAR PREMIUM GRÁTIS
                </button>
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="block w-full py-4 text-zinc-500 hover:text-white font-bold transition-colors"
                >
                  Agora não
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-white/5 flex flex-col p-6 bg-zinc-950/80 backdrop-blur-2xl z-20 md:sticky top-0 md:h-screen overflow-y-auto scrollbar-hide">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none">NEXIS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Flow Studio</p>
          </div>
        </div>

        <div className="mb-6 px-2">
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-black mb-4">Menu Principal</p>
          <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-4 md:pb-0 scrollbar-hide -mx-2 px-2">
            <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" color="from-emerald-500 to-teal-600" />
            <SidebarItem id="expenses" icon={Wallet} label="Despesas" color="from-blue-500 to-indigo-600" />
            <SidebarItem id="projects" icon={Briefcase} label="Projetos" color="from-purple-500 to-pink-600" />
            <SidebarItem id="chat" icon={MessageSquare} label="Assistente IA" color="from-orange-500 to-red-600" />
            <SidebarItem id="calculator" icon={CalcIcon} label="Calculadora" color="from-zinc-600 to-zinc-800" />
          </nav>
        </div>

        {userRole === 'user' && (
          <div className="mt-auto p-6 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-blue-600/5 to-transparent border border-white/10 relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                  <Sparkles size={14} className="text-emerald-400" />
                </div>
                <span className="text-[9px] uppercase tracking-[0.3em] text-emerald-500 font-black">Pro Plan</span>
              </div>
              
              <h4 className="text-lg font-black mb-2 tracking-tighter leading-tight">Nexis Premium</h4>
              <p className="text-[10px] text-zinc-400 font-medium mb-4 leading-relaxed">
                Desbloqueie IA ilimitada e recursos exclusivos.
              </p>
              
              <button 
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                {isUpgrading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                Upgrade Agora
              </button>
            </div>
          </div>
        )}

        <div className="mt-auto pt-10 space-y-4">
          <div className="p-5 rounded-[2rem] bg-zinc-900/50 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
                 {user.photoURL ? (
                   <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                 ) : (
                   <UserIcon size={24} className="text-zinc-400" />
                 )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black truncate tracking-tight">{user.displayName || 'Usuário'}</p>
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${userRole === 'user' ? 'bg-zinc-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                  <p className={`text-[9px] font-black uppercase tracking-[0.15em] ${userRole === 'user' ? 'text-zinc-500' : 'text-emerald-500'}`}>
                    {userRole === 'admin' ? 'Administrator' : userRole === 'premium' ? 'Premium' : 'Free'}
                  </p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                title="Sair"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          
          <div className="px-2 space-y-2">
            {user?.email === 'lemarksss321@gmail.com' && (
              <button 
                onClick={() => setIsAdminModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 text-amber-500/60 hover:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] py-3 border border-dashed border-amber-500/20 rounded-xl hover:border-amber-500/40 transition-all"
              >
                <Settings size={14} />
                Admin Config
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative bg-zinc-950 min-h-screen">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>
        
        {/* Header */}
        <header className="sticky top-0 z-10 flex flex-col md:flex-row items-start md:items-center justify-between px-6 md:px-10 py-6 md:py-8 bg-zinc-950/40 backdrop-blur-xl border-b border-white/5 gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight capitalize">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'expenses' ? 'Despesas' : activeTab === 'projects' ? 'Projetos' : activeTab === 'chat' ? 'Assistente IA' : 'Calculadora'}
            </h2>
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">Visão Geral do Sistema</p>
          </div>
          
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="flex-1 md:w-64 bg-white/5 p-2 pr-4 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-xl">
                <Search size={16} className="text-emerald-500" />
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                className="bg-transparent border-none outline-none text-sm w-full text-zinc-300 placeholder:text-zinc-600"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-zinc-950"></span>
              </button>
              <button className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                <Settings size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <Wallet className="text-white" size={24} />
                      </div>
                      <button 
                        onClick={() => {
                          setIsEditingBudget(!isEditingBudget);
                          if (isEditingBudget) updateBudgetGoal(budgetGoal);
                        }}
                        className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full hover:bg-emerald-500/20 transition-colors"
                      >
                        {isEditingBudget ? 'Salvar Meta' : 'Definir Meta'}
                      </button>
                    </div>
                    {isEditingBudget ? (
                      <input 
                        type="number" 
                        value={budgetGoal} 
                        onChange={(e) => setBudgetGoal(Number(e.target.value))}
                        className="text-4xl font-black tracking-tighter mb-2 bg-transparent border-b border-emerald-500/50 outline-none w-full text-white"
                        autoFocus
                      />
                    ) : (
                      <h2 className="text-5xl font-black tracking-tighter mb-2">${totalExpenses.toLocaleString()}</h2>
                    )}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Progresso da Meta</p>
                      <p className="text-emerald-500 text-[10px] font-black tracking-widest">{Math.min(Math.round((totalExpenses / budgetGoal) * 100), 100)}%</p>
                    </div>
                    <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((totalExpenses / budgetGoal) * 100), 100}%` }}
                        className={`h-full rounded-full ${totalExpenses > budgetGoal ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`}
                      ></motion.div>
                    </div>
                    <p className="text-zinc-500 text-[10px] font-medium mt-3">
                      Meta: <span className="text-white font-bold">${budgetGoal.toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/5 border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-500/20">
                        <Briefcase className="text-white" size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full">Fluxo Ativo</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter mb-2">{projects.length}</h2>
                    <p className="text-blue-500 text-sm font-bold">{projects.filter(p => p.status === 'Em Progresso').length} <span className="text-zinc-500 font-medium ml-1">atualmente em progresso</span></p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-600/5 border border-purple-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-purple-500 rounded-2xl shadow-lg shadow-purple-500/20">
                        <MessageSquare className="text-white" size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 bg-purple-500/10 px-3 py-1 rounded-full">Insights de IA</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter mb-2">12</h2>
                    <p className="text-purple-500 text-sm font-bold">Recomendações <span className="text-zinc-500 font-medium ml-1">otimizadas</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-3">
                        <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                        Fluxo de Gastos
                      </h3>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                          <span className="text-[10px] font-bold text-emerald-500 uppercase">Saídas</span>
                        </div>
                      </div>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData.length > 0 ? chartData : [{date: 'Sem Dados', amount: 0}]}>
                          <defs>
                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#71717a" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(str) => str === 'Sem Dados' ? str : new Date(str).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          />
                          <YAxis 
                            stroke="#71717a" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '1rem' }}
                            itemStyle={{ color: '#10b981' }}
                          />
                          <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] p-8">
                    <h3 className="text-xl font-bold flex items-center gap-3 mb-8">
                      <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                      Categorias
                    </h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={categoryData.length > 0 ? categoryData : [{name: 'Sem Dados', value: 1}]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {categoryData.length > 0 ? categoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            )) : <Cell fill="#27272a" />}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #ffffff10', borderRadius: '1rem' }}
                          />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {categoryData.length > 0 ? categoryData.slice(0, 4).map((cat, index) => (
                        <div key={cat.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="text-[10px] text-zinc-400 font-bold uppercase truncate">{cat.name}</span>
                        </div>
                      )) : (
                        <p className="text-[10px] text-zinc-500 uppercase font-bold col-span-2 text-center">Nenhuma categoria registrada</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-3">
                        <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                        Transações Recentes
                      </h3>
                      <button className="text-xs font-bold text-emerald-500 hover:underline uppercase tracking-widest">Ver Tudo</button>
                    </div>
                    <div className="space-y-4">
                      {expenses.slice(0, 4).map(exp => (
                        <div key={exp.id} className="flex items-center justify-between p-5 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center text-lg font-black text-emerald-500 border border-white/5 group-hover:scale-110 transition-transform">
                              {exp.category[0]}
                            </div>
                            <div>
                              <p className="font-bold text-lg">{exp.description}</p>
                              <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest mt-1">{exp.category} • {exp.date}</p>
                            </div>
                          </div>
                          <p className="text-xl font-black text-emerald-400">-${exp.amount.toLocaleString()}</p>
                        </div>
                      ))}
                      {expenses.length === 0 && (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 text-zinc-700">
                            <Wallet size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium italic">Seu livro contábil está vazio.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-3">
                        <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                        Roteiro de Projetos
                      </h3>
                      <button className="text-xs font-bold text-blue-500 hover:underline uppercase tracking-widest">Gerenciar</button>
                    </div>
                    <div className="space-y-4">
                      {projects.slice(0, 4).map(proj => (
                        <div key={proj.id} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold text-lg group-hover:text-blue-400 transition-colors">{proj.title}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                              proj.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-500' :
                              proj.status === 'Em Progresso' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-zinc-500/20 text-zinc-500'
                            }`}>
                              {proj.status}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-400 line-clamp-2 font-medium leading-relaxed">{proj.content}</p>
                        </div>
                      ))}
                      {projects.length === 0 && (
                        <div className="text-center py-16">
                          <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-4 text-zinc-700">
                            <Briefcase size={32} />
                          </div>
                          <p className="text-zinc-500 font-medium italic">Nenhum projeto ativo encontrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">Livro Financeiro</h2>
                    <p className="text-zinc-500 font-medium mt-1">Acompanhe e gerencie seu fluxo de capital com precisão.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex items-center gap-3 bg-zinc-900 border border-white/10 hover:bg-white/5 text-zinc-300 px-6 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all">
                      {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                      {isScanning ? 'Escanenando...' : 'Escanear Recibo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleScanReceipt} disabled={isScanning} />
                    </label>
                    <button 
                      onClick={() => setIsAddingExpense(true)}
                      className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/20"
                    >
                      <Plus size={20} /> Nova Entrada
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {expenses.map(exp => (
                    <motion.div 
                      layout
                      key={exp.id} 
                      className="group flex items-center justify-between p-6 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[2.5rem] hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-8">
                        <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center text-emerald-500 text-xl font-black border border-white/5 shadow-inner">
                          {exp.category[0]}
                        </div>
                        <div>
                          <p className="text-xl font-black tracking-tight">{exp.description}</p>
                          <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 mt-2">
                            <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full uppercase tracking-widest">{exp.category}</span>
                            <span className="flex items-center gap-1"><Calendar size={12} /> {exp.date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <p className="text-3xl font-black text-emerald-400">-${exp.amount.toFixed(2)}</p>
                        <button 
                          onClick={() => deleteExpense(exp.id)}
                          className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {expenses.length === 0 && (
                    <div className="text-center py-32 bg-zinc-900/10 rounded-[3rem] border border-dashed border-white/10">
                      <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-zinc-700">
                        <Wallet size={40} />
                      </div>
                      <h3 className="text-2xl font-black mb-2">Nenhuma Transação Ainda</h3>
                      <p className="text-zinc-500 max-w-xs mx-auto font-medium">Comece a construir seu histórico financeiro adicionando sua primeira despesa.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'projects' && (
              <motion.div
                key="projects"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight">Central de Projetos</h2>
                    <p className="text-zinc-500 font-medium mt-1">Arquitetura sua visão profissional e acompanhe o progresso.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingProject(true)}
                    className="flex items-center gap-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-500/20"
                  >
                    <Plus size={20} /> Criar Projeto
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {projects.map(proj => (
                    <motion.div 
                      layout
                      key={proj.id} 
                      className="group p-8 bg-zinc-900/20 backdrop-blur-md border border-white/5 rounded-[3rem] hover:bg-white/5 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -z-10 group-hover:bg-blue-500/10 transition-all"></div>
                      <div className="flex items-center justify-between mb-6">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full ${
                          proj.status === 'Concluído' ? 'bg-emerald-500/20 text-emerald-500' :
                          proj.status === 'Em Progresso' ? 'bg-blue-500/20 text-blue-500' :
                          'bg-zinc-500/20 text-zinc-500'
                        }`}>
                          {proj.status}
                        </span>
                        <button 
                          onClick={() => deleteProject(proj.id)}
                          className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h3 className="text-2xl font-black mb-4 group-hover:text-blue-400 transition-colors">{proj.title}</h3>
                      <p className="text-zinc-400 font-medium leading-relaxed mb-8 line-clamp-4">{proj.content}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Atualizado: {new Date(proj.lastModified).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => setSelectedProjectId(proj.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                          >
                            <ListTodo size={14} /> 
                            {proj.tasks?.length || 0} Tarefas
                          </button>
                        </div>
                        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-blue-500 transition-all">
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  {projects.length === 0 && (
                    <div className="col-span-full text-center py-32 bg-zinc-900/10 rounded-[3rem] border border-dashed border-white/10">
                      <div className="w-20 h-20 bg-zinc-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-zinc-700">
                        <Briefcase size={40} />
                      </div>
                      <h3 className="text-2xl font-black mb-2">Nenhum Projeto Ativo</h3>
                      <p className="text-zinc-500 max-w-xs mx-auto font-medium">Seu roteiro profissional começa aqui. Crie seu primeiro projeto para começar.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[600px] md:h-[700px] flex flex-col bg-zinc-900/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
              >
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black tracking-tight">Inteligência Nexis</h2>
                      <p className="text-xs text-orange-500 font-bold uppercase tracking-widest">Ativo • Sistema Especialista de IA</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    {(['formal', 'informal', 'criativo'] as ChatTone[]).map((tone) => (
                      <button
                        key={tone}
                        onClick={() => setChatTone(tone)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          chatTone === tone
                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {tone}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  {chatHistory.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                      <div className="w-24 h-24 rounded-[2.5rem] bg-zinc-900 flex items-center justify-center text-zinc-700 border border-white/5 shadow-2xl">
                        <TrendingUp size={48} />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black tracking-tighter">Insights Estratégicos</h3>
                        <p className="text-zinc-500 font-medium max-w-sm mx-auto leading-relaxed">
                          Pergunte sobre otimização de capital, eficiência de projetos ou crescimento estratégico com base em seus dados atuais.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        {['Dicas de Economia', 'Ajuda em Projetos', 'Tendências'].map(tip => (
                          <button key={tip} onClick={() => setChatInput(`Me dê algumas ${tip.toLowerCase()}`)} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs font-bold text-zinc-400 transition-all uppercase tracking-widest">
                            {tip}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-6 rounded-[2rem] shadow-xl ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-tr-none' 
                          : 'bg-zinc-900/80 backdrop-blur-md text-zinc-200 rounded-tl-none border border-white/10'
                      }`}>
                        <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-900/80 p-6 rounded-[2rem] rounded-tl-none border border-white/10">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChat} className="p-8 border-t border-white/5 bg-zinc-950/50 backdrop-blur-xl">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Consulte a Nexis AI..."
                      className="flex-1 bg-zinc-900 border border-white/10 rounded-[2rem] px-8 py-5 outline-none focus:border-orange-500/50 transition-all text-sm font-medium shadow-inner"
                    />
                    <button 
                      type="submit"
                      disabled={isChatLoading}
                      className="bg-gradient-to-r from-orange-500 to-red-600 hover:scale-105 text-white p-5 rounded-[2rem] transition-all shadow-xl shadow-orange-500/20 disabled:opacity-50"
                    >
                      <Send size={24} />
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {activeTab === 'calculator' && (
              <motion.div
                key="calculator"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center justify-center py-6"
              >
                <Calculator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Task Management Modal */}
        <AnimatePresence>
          {selectedProjectId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedProjectId(null)}
                className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
              ></motion.div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">Checklist do Projeto</h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1">
                      {projects.find(p => p.id === selectedProjectId)?.title}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedProjectId(null)}
                    className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {projects.find(p => p.id === selectedProjectId)?.tasks?.map(task => (
                    <div key={task.id} className="flex items-center justify-between group">
                      <button 
                        onClick={() => toggleTask(selectedProjectId, task.id)}
                        className="flex items-center gap-4 flex-1 text-left"
                      >
                        {task.completed ? (
                          <CheckCircle2 size={24} className="text-emerald-500" />
                        ) : (
                          <Circle size={24} className="text-zinc-700 group-hover:text-zinc-500" />
                        )}
                        <span className={`font-medium transition-all ${task.completed ? 'text-zinc-600 line-through' : 'text-zinc-300'}`}>
                          {task.text}
                        </span>
                      </button>
                      <button 
                        onClick={() => deleteTask(selectedProjectId, task.id)}
                        className="p-2 text-zinc-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!projects.find(p => p.id === selectedProjectId)?.tasks || projects.find(p => p.id === selectedProjectId)?.tasks?.length === 0) && (
                    <p className="text-center py-8 text-zinc-600 italic font-medium">Nenhuma tarefa adicionada.</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <input 
                    type="text" 
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTask(selectedProjectId)}
                    placeholder="Nova tarefa..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button 
                    onClick={() => addTask(selectedProjectId)}
                    className="p-4 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingExpense(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Nova Despesa</h3>
                <button onClick={() => setIsAddingExpense(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Descrição</label>
                  <input 
                    type="text" 
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="ex: Aluguel Mensal" 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Valor</label>
                    <input 
                      type="number" 
                      value={newExpense.amount || ''}
                      onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                      placeholder="0.00" 
                      className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Categoria</label>
                    <select 
                      value={newExpense.category}
                      onChange={e => setNewExpense({...newExpense, category: e.target.value as any})}
                      className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors appearance-none"
                    >
                      <option value="Comida">Comida</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Moradia">Moradia</option>
                      <option value="Trabalho">Trabalho</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
                <button 
                  onClick={addExpense}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg transition-all mt-4 shadow-lg shadow-emerald-900/20"
                >
                  Confirmar Despesa
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isAddingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingProject(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Novo Projeto</h3>
                <button onClick={() => setIsAddingProject(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Título do Projeto</label>
                  <input 
                    type="text" 
                    value={newProject.title}
                    onChange={e => setNewProject({...newProject, title: e.target.value})}
                    placeholder="ex: Estratégia de Marketing Q1" 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Conteúdo / Notas</label>
                  <textarea 
                    rows={6}
                    value={newProject.content}
                    onChange={e => setNewProject({...newProject, content: e.target.value})}
                    placeholder="Descreva os objetivos do projeto, tarefas e notas..." 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Status</label>
                  <div className="flex gap-4">
                    {['Planejamento', 'Em Progresso', 'Concluído'].map(status => (
                      <button
                        key={status}
                        onClick={() => setNewProject({...newProject, status: status as any})}
                        className={`flex-1 py-3 rounded-xl border transition-all text-sm font-medium ${
                          newProject.status === status 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-zinc-800 border-white/5 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={addProject}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold text-lg transition-all mt-4 shadow-lg shadow-blue-900/20"
                >
                  Criar Projeto
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Admin Settings Modal */}
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsAdminModalOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-zinc-900 border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold">Configurações de Admin</h3>
                <button onClick={() => setIsAdminModalOpen(false)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <div className="space-y-6">
                <p className="text-sm text-zinc-400">
                  Use este painel para configurar as chaves do Stripe caso não consiga acessar o menu lateral do AI Studio.
                </p>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">Stripe Secret Key</label>
                  <input 
                    type="password" 
                    value={adminConfig.secretKey}
                    onChange={e => setAdminConfig({...adminConfig, secretKey: e.target.value})}
                    placeholder="sk_test_..." 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-2 block">App URL</label>
                  <input 
                    type="text" 
                    value={adminConfig.appUrl}
                    onChange={e => setAdminConfig({...adminConfig, appUrl: e.target.value})}
                    placeholder="https://sua-url.run.app" 
                    className="w-full bg-zinc-800 border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <button 
                  onClick={saveAdminConfig}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg transition-all mt-4 shadow-lg shadow-emerald-900/20"
                >
                  Salvar Configurações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
