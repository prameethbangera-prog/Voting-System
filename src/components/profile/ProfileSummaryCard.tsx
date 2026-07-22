
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, LogOut, Save, Camera, Loader2, X } from 'lucide-react';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ProfileSummaryCardProps {
  profile: {
    full_name: string;
    avatar_url?: string | null;
  } | null;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  editedName: string;
  setEditedName: (value: string) => void;
  isChangingPhoto: boolean;
  setIsChangingPhoto: (value: boolean) => void;
}

const ProfileSummaryCard = ({
  profile,
  isEditing,
  setIsEditing,
  editedName,
  setEditedName,
  isChangingPhoto,
  setIsChangingPhoto
}: ProfileSummaryCardProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update user profile mutation
  const updateProfile = useMutation({
    mutationFn: async (data: { full_name: string }) => {
      if (!user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    }
  });

  // Upload profile photo mutation
  const uploadProfilePhoto = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('User not authenticated');
      
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
        
      if (uploadError) throw uploadError;
      
      // Get public URL for the uploaded image
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
        
      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      return data.publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      setIsChangingPhoto(false);
      toast({
        title: "Profile Photo Updated",
        description: "Your profile photo has been successfully updated.",
      });
    },
    onError: (error) => {
      setIsChangingPhoto(false);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update profile photo",
        variant: "destructive",
      });
    }
  });

  const handleProfilePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsChangingPhoto(true);
    uploadProfilePhoto.mutate(file);
  };

  const handleSave = () => {
    if (!editedName.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    updateProfile.mutate({ 
      full_name: editedName 
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    if (profile) {
      setEditedName(profile.full_name || '');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleVoteNow = () => {
    navigate('/vote');
  };

  return (
    <>
      <CardHeader className="flex flex-col items-center">
        <div className="relative mb-4">
          <Avatar className="h-24 w-24 cursor-pointer" onClick={handleProfilePhotoClick}>
            {isChangingPhoto || uploadProfilePhoto.isPending ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                <AvatarFallback>
                  {profile?.full_name?.split(' ').map(n => n[0]).join('') || user?.email?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </>
            )}
          </Avatar>
          
          {isEditing && (
            <div 
              className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full cursor-pointer hover:bg-primary/80"
              onClick={handleProfilePhotoClick}
            >
              <Camera size={16} />
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
        
        <CardTitle className="text-center">{profile?.full_name || 'Loading...'}</CardTitle>
        <p className="text-sm text-muted-foreground">{user?.email || ''}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isEditing ? (
          <>
            <Button 
              onClick={handleSave} 
              variant="default" 
              className="w-full flex items-center gap-2"
              disabled={updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              onClick={handleCancel} 
              variant="outline" 
              className="w-full flex items-center gap-2"
              disabled={updateProfile.isPending}
            >
              <X size={16} />
              Cancel
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => setIsEditing(true)} variant="outline" className="w-full flex items-center gap-2">
              <Edit size={16} />
              Edit Profile
            </Button>
            <Button 
              onClick={handleVoteNow} 
              variant="default" 
              className="w-full flex items-center gap-2"
            >
              Cast Your Vote
            </Button>
          </>
        )}
        <Button 
          variant="outline" 
          className="w-full flex items-center gap-2 text-destructive"
          onClick={handleSignOut}
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </CardContent>
    </>
  );
};

export default ProfileSummaryCard;
