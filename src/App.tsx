import { useState, useEffect } from 'react';
import { Brain, Users, LogOut, UserPlus } from 'lucide-react';
import { supabase, User } from './lib/supabase';
import OnboardingModal from './components/OnboardingModal';
import InfiniteCanvas from './components/InfiniteCanvas';
import UserModal from './components/UserModal';
import QuizModal from './components/QuizModal';

function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
    loadUsers();

    const channel = supabase
      .channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        loadUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUser = () => {
    const userId = localStorage.getItem('inco_user_id');
    if (userId) {
      setCurrentUser(userId);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });

    if (data && !error) {
      setUsers(data);
    }
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setShowOnboardingForm(false);
    const userId = localStorage.getItem('inco_user_id');
    setCurrentUser(userId);
    loadUsers();
  };

  const handleLogout = () => {
    localStorage.removeItem('inco_user_id');
    localStorage.removeItem('inco_x_username');
    setCurrentUser(null);
  };

  const openJoinModal = () => {
    setShowOnboarding(true);
    setShowOnboardingForm(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <header className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">IC</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Inco Circle</h1>
                <p className="text-sm text-gray-400">Privacy Advocates in Web3</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-400 bg-slate-800 px-4 py-2 rounded-lg">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">{users.length} Members</span>
              </div>

              <button
                onClick={() => setShowQuiz(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl"
              >
                <Brain className="w-4 h-4" />
                <span className="font-medium">Take Quiz</span>
              </button>

              {!currentUser && (
                <button
                  onClick={openJoinModal}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-cyan-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  <span className="font-medium">Join Circle</span>
                </button>
              )}

              {currentUser && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-20 h-screen">
        <InfiniteCanvas users={users} onUserClick={setSelectedUser} />
      </main>

      {showOnboarding && <OnboardingModal onComplete={handleOnboardingComplete} onShowForm={() => setShowOnboardingForm(true)} showForm={showOnboardingForm} />}
      {selectedUser && <UserModal user={selectedUser} onClose={() => setSelectedUser(null)} />}
      {showQuiz && <QuizModal onClose={() => setShowQuiz(false)} />}
    </div>
  );
}

export default App;
