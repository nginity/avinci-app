import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Profile {
  id: string;
  preferred_language: string;
}

export default function DocumentUpload() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userLanguage, setUserLanguage] = useState<string>('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

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
          setUserLanguage(profile.preferred_language);
          i18n.changeLanguage(profile.preferred_language);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUserProfile();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('profile_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const newProfile = payload.new as Profile;
          if (newProfile?.preferred_language) {
            setUserLanguage(newProfile.preferred_language);
            i18n.changeLanguage(newProfile.preferred_language);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate, i18n]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <h1 className="text-2xl font-bold mb-4">{t('upload.title')}</h1>
      <p>{t('upload.description')}</p>
      {/* Add your upload form or component here */}
    </div>
  );
}
