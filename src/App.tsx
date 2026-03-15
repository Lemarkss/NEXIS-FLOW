import React, { useState, useEffect, useRef } from 'react';
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
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Project, ChatMessage } from './types';
import { getChatResponse } from './services/geminiService';
import Calculator from './components/Calculator';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'projects' | 'chat' | 'calculator'>('dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Form states
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({ category: 'Outro', amount: 0, description: '' });
  const [newProject, setNewProject] = useState<Partial<Project>>({ title: '', content: '', status: 'Planejamento' });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isAddingProject, setIsAddingProject] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const addExpense = () => {
    if (!newExpense.description || !newExpense.amount) return;
    const expense: Expense = {
      id: Math.random().toString(36).substr(2, 9),
      description: newExpense.description,
      amount: Number(newExpense.amount),
      category: newExpense.category as any,
      date: new Date().toISOString().split('T')[0]
    };
    setExpenses([expense, ...expenses]);
    setNewExpense({ category: 'Outro', amount: 0, description: '' });
    setIsAddingExpense(false);
  };

  const addProject = () => {
    if (!newProject.title || !newProject.content) return;
    const project: Project = {
      id: Math.random().toString(36).substr(2, 9),
      title: newProject.title,
      content: newProject.content,
      status: newProject.status as any,
      lastModified: new Date().toISOString()
    };
    setProjects([project, ...projects]);
    setNewProject({ title: '', content: '', status: 'Planejamento' });
    setIsAddingProject(false);
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await getChatResponse(chatHistory, chatInput, { expenses, projects });
      setChatHistory(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', text: "Estou com problemas para me conectar agora. Por favor, tente novamente." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const SidebarItem = ({ id, icon: Icon, label, color }: { id: typeof activeTab, icon: any, label: string, color: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-2xl transition-all duration-300 group ${
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

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col p-6 bg-zinc-950/80 backdrop-blur-2xl z-20">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
            <TrendingUp size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter leading-none">NEXIS</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-500 font-bold">Flow Studio</p>
          </div>
        </div>

        <nav className="flex-1 space-y-3">
          <SidebarItem id="dashboard" icon={LayoutDashboard} label="Dashboard" color="from-emerald-500 to-teal-600" />
          <SidebarItem id="expenses" icon={Wallet} label="Despesas" color="from-blue-500 to-indigo-600" />
          <SidebarItem id="projects" icon={Briefcase} label="Projetos" color="from-purple-500 to-pink-600" />
          <SidebarItem id="chat" icon={MessageSquare} label="Assistente IA" color="from-orange-500 to-red-600" />
          <SidebarItem id="calculator" icon={CalcIcon} label="Calculadora" color="from-zinc-600 to-zinc-800" />
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <div className="p-4 rounded-3xl bg-gradient-to-br from-zinc-900 to-black border border-white/5 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center overflow-hidden border border-white/10">
                 <User size={20} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-bold">Lemark S.</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Pro Member</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-zinc-950">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] -z-10 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] -z-10"></div>
        
        {/* Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between px-10 py-8 bg-zinc-950/40 backdrop-blur-xl border-b border-white/5">
          <div>
            <h2 className="text-3xl font-black tracking-tight capitalize">{activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'expenses' ? 'Despesas' : activeTab === 'projects' ? 'Projetos' : activeTab === 'chat' ? 'Assistente IA' : 'Calculadora'}</h2>
            <p className="text-zinc-500 text-sm font-medium">Bem-vindo de volta, aqui está sua visão geral.</p>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 bg-white/5 px-5 py-3 rounded-2xl border border-white/5 w-80 focus-within:border-emerald-500/50 transition-all">
              <Search size={18} className="text-zinc-500" />
              <input 
                type="text" 
                placeholder="Pesquisar análises..." 
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

        <div className="p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-500/20">
                        <Wallet className="text-white" size={24} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">Orçamento Mensal</span>
                    </div>
                    <h2 className="text-5xl font-black tracking-tighter mb-2">${totalExpenses.toLocaleString()}</h2>
                    <p className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                      <TrendingUp size={14} /> +2.5% <span className="text-zinc-500 font-medium ml-1">vs mês anterior</span>
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
                  <button 
                    onClick={() => setIsAddingExpense(true)}
                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:scale-105 text-white px-8 py-4 rounded-[2rem] font-black uppercase tracking-widest text-xs transition-all shadow-xl shadow-emerald-500/20"
                  >
                    <Plus size={20} /> Nova Entrada
                  </button>
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
                          onClick={() => setExpenses(expenses.filter(e => e.id !== exp.id))}
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
                          onClick={() => setProjects(projects.filter(p => p.id !== proj.id))}
                          className="p-3 bg-red-500/10 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <h3 className="text-2xl font-black mb-4 group-hover:text-blue-400 transition-colors">{proj.title}</h3>
                      <p className="text-zinc-400 font-medium leading-relaxed mb-8 line-clamp-4">{proj.content}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Atualizado: {new Date(proj.lastModified).toLocaleDateString()}</p>
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-[calc(100vh-250px)] flex flex-col bg-zinc-900/20 backdrop-blur-xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
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
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-orange-500/50 rounded-full"></div>
                    <div className="w-2 h-2 bg-orange-500/20 rounded-full"></div>
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center justify-center py-12"
              >
                <Calculator />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
      </AnimatePresence>
    </div>
  );
}
