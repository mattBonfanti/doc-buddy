import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  placeOfBirth: string;
  email: string;
  phone: string;
  currentAddress: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  passportNumber: string;
  passportExpiry: string;
  codiceFiscale: string;
  permessoNumber: string;
  permessoExpiry: string;
  employer: string;
  occupation: string;
  university: string;
  studyProgram: string;
  lastUpdated: string;
  manuallyEditedFields: string[];
}

const STORAGE_KEY = 'fitin_profile';

const createEmptyProfile = (): UserProfile => ({
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  nationality: '',
  placeOfBirth: '',
  email: '',
  phone: '',
  currentAddress: {
    street: '',
    city: '',
    province: '',
    postalCode: '',
  },
  passportNumber: '',
  passportExpiry: '',
  codiceFiscale: '',
  permessoNumber: '',
  permessoExpiry: '',
  employer: '',
  occupation: '',
  university: '',
  studyProgram: '',
  lastUpdated: '',
  manuallyEditedFields: [],
});

export const useProfileStorage = () => {
  const [profile, setProfile] = useState<UserProfile>(createEmptyProfile);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }
  }, []);

  const saveProfile = useCallback((updates: Partial<UserProfile>, markAsManual: string[] = []) => {
    setProfile(prev => {
      const newProfile = {
        ...prev,
        ...updates,
        lastUpdated: new Date().toISOString(),
        manuallyEditedFields: [
          ...new Set([...prev.manuallyEditedFields, ...markAsManual])
        ],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
      return newProfile;
    });
  }, []);

  const extractFromDocuments = useCallback(async (documentTexts: string[]) => {
    if (documentTexts.length === 0) return;

    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-profile-info', {
        body: { documentTexts },
      });

      if (error) throw error;

      const extracted = data.profile;
      
      // Merge extracted data with existing profile, preserving manually edited fields
      setProfile(prev => {
        const merged = { ...prev };
        const fieldsToMerge = [
          'firstName', 'lastName', 'dateOfBirth', 'nationality', 'placeOfBirth',
          'email', 'phone', 'passportNumber', 'passportExpiry', 'codiceFiscale',
          'permessoNumber', 'permessoExpiry', 'employer', 'occupation',
          'university', 'studyProgram'
        ];

        fieldsToMerge.forEach(field => {
          // Only update if not manually edited and new value exists
          if (!prev.manuallyEditedFields.includes(field) && extracted[field]) {
            (merged as any)[field] = extracted[field];
          }
        });

        // Handle nested address object
        if (extracted.currentAddress) {
          const addressFields = ['street', 'city', 'province', 'postalCode'];
          addressFields.forEach(field => {
            const fullField = `currentAddress.${field}`;
            if (!prev.manuallyEditedFields.includes(fullField) && extracted.currentAddress[field]) {
              merged.currentAddress[field as keyof typeof merged.currentAddress] = extracted.currentAddress[field];
            }
          });
        }

        merged.lastUpdated = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      });

      return extracted;
    } catch (error) {
      console.error('Failed to extract profile:', error);
      throw error;
    } finally {
      setIsExtracting(false);
    }
  }, []);

  const clearProfile = useCallback(() => {
    const empty = createEmptyProfile();
    setProfile(empty);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    profile,
    saveProfile,
    extractFromDocuments,
    clearProfile,
    isExtracting,
  };
};
