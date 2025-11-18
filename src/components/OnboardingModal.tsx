import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OnboardingModalProps {
  onComplete: () => void;
  onShowForm: () => void;
  showForm: boolean;
}

export default function OnboardingModal({ onComplete, onShowForm, showForm }: OnboardingModalProps) {
  const [xUsername, setXUsername] = useState('');
  const [privacyAnswer, setPrivacyAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(false);

  const wordCount = privacyAnswer.trim().split(/\s+/).filter(Boolean).length;
  const isValid = xUsername.trim() && wordCount > 0 && wordCount <= 50;

  const fetchProfilePhoto = async (username: string): Promise<string> => {
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-x-profile`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      return data.profile_image_url || `https://ui-avatars.com/api/?name=${username}&background=random`;
    } catch {
      return `https://ui-avatars.com/api/?name=${username}&background=random`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setError('Please fill all fields. Privacy answer must be 50 words or less.');
      return;
    }

    setLoading(true);
    setFetchingProfile(true);
    setError('');

    try {
      const cleanUsername = xUsername.trim().replace('@', '');

      const { data: existingUser, error: queryError } = await supabase
        .from('users')
        .select('id, x_username')
        .eq('x_username', cleanUsername)
        .maybeSingle();

      if (queryError) {
        setError('Failed to check username. Please try again.');
        setLoading(false);
        setFetchingProfile(false);
        return;
      }

      if (existingUser) {
        localStorage.setItem('inco_user_id', existingUser.id);
        localStorage.setItem('inco_x_username', existingUser.x_username);
        onComplete();
        return;
      }

      const profilePhotoUrl = await fetchProfilePhoto(cleanUsername);

      const { data, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            x_username: cleanUsername,
            privacy_answer: privacyAnswer.trim(),
            profile_photo_url: profilePhotoUrl,
          },
        ])
        .select()
        .single();

      if (insertError) {
        setError('Failed to join. Please try again.');
        setLoading(false);
        setFetchingProfile(false);
        return;
      }

      if (data) {
        localStorage.setItem('inco_user_id', data.id);
        localStorage.setItem('inco_x_username', data.x_username);
        onComplete();
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setLoading(false);
      setFetchingProfile(false);
    }
  };

  if (!showForm) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-12 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white text-4xl font-bold">IC</span>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-gray-900 mb-2">
            Ready to Join?
          </h2>
          <p className="text-gray-600 mb-8 text-lg">
            Add yourself to the circle and connect with privacy advocates in Web3
          </p>

          <div className="space-y-3">
            <button
              onClick={onShowForm}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold py-4 px-6 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Join the Circle
            </button>
            <button
              onClick={onComplete}
              className="w-full bg-slate-200 text-gray-900 font-semibold py-4 px-6 rounded-lg hover:bg-slate-300 transition-all"
            >
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 relative">
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">IC</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Join Inco Circle
        </h2>
        <p className="text-gray-600 text-center mb-8">
          Connect with privacy advocates in Web3
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="xUsername" className="block text-sm font-semibold text-gray-700 mb-2">
              X Username
            </label>
            <input
              type="text"
              id="xUsername"
              value={xUsername}
              onChange={(e) => setXUsername(e.target.value)}
              placeholder="@username"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={loading || fetchingProfile}
            />
          </div>

          <div>
            <label htmlFor="privacyAnswer" className="block text-sm font-semibold text-gray-700 mb-2">
              Why is privacy important to you?
              <span className="text-gray-500 font-normal ml-2">
                ({wordCount}/50 words)
              </span>
            </label>
            <textarea
              id="privacyAnswer"
              value={privacyAnswer}
              onChange={(e) => setPrivacyAnswer(e.target.value)}
              placeholder="Share your thoughts in 50 words or less..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              disabled={loading || fetchingProfile}
            />
            {wordCount > 50 && (
              <p className="text-red-600 text-sm mt-1">
                Please keep your answer under 50 words
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading || fetchingProfile}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {fetchingProfile && <Loader className="w-4 h-4 animate-spin" />}
            {loading || fetchingProfile ? 'Joining...' : 'Join the Circle'}
          </button>
        </form>
      </div>
    </div>
  );
}
