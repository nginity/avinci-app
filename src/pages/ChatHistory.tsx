import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ChatMessage {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
}

const RTL_LANGUAGES = ['he', 'fa'];

export default function ChatHistory() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const isRTL = RTL_LANGUAGES.includes(i18n.language);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        if (profile?.preferred_language) {
          console.log('Setting language to:', profile.preferred_language);
          i18n.changeLanguage(profile.preferred_language);
          document.dir = RTL_LANGUAGES.includes(profile.preferred_language) ? 'rtl' : 'ltr';
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUserProfile();
  }, [i18n]);

  useEffect(() => {
    const fetchChats = async () => {
      try {
        console.log('Fetching chat history...');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: chatHistory, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching chats:', error);
          toast({
            title: t('chat.errorLoading'),
            variant: "destructive"
          });
          return;
        }

        console.log('Fetched chat history:', chatHistory);
        setChats(chatHistory || []);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();

    const channel = supabase
      .channel('chat_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          console.log('Chat message changed:', payload);
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [t, toast]);

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? 'rtl' : 'ltr'}`}>
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">{t('chat.title')}</h1>
      
      {loading ? (
        <p className="text-center text-gray-600">{t('chat.loadingChats')}</p>
      ) : chats.length === 0 ? (
        <p className="text-center text-gray-600">{t('chat.noChats')}</p>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow ${
                isRTL ? 'text-right' : 'text-left'
              }`}
            >
              <p className="text-gray-800">{chat.content}</p>
              <p className="text-sm text-gray-500 mt-2">
                {new Date(chat.created_at).toLocaleString(i18n.language)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}