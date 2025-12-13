import { useState, useEffect } from 'react';
import { User, RefreshCw, Save, FileText, Edit3, Sparkles } from 'lucide-react';
import { useProfileStorage, UserProfile } from '@/hooks/useProfileStorage';
import { StoredDocument } from '@/hooks/useDocumentStorage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface MyProfileProps {
  documents: StoredDocument[];
}

interface FieldProps {
  label: string;
  value: string;
  fieldKey: string;
  onChange: (key: string, value: string) => void;
  isManuallyEdited: boolean;
}

const ProfileField = ({ label, value, fieldKey, onChange, isManuallyEdited }: FieldProps) => (
  <div className="space-y-1">
    <Label className="text-xs font-mono text-muted-foreground flex items-center gap-1">
      {label}
      {isManuallyEdited ? (
        <span title="Manually edited"><Edit3 size={10} className="text-primary" /></span>
      ) : value ? (
        <span title="Auto-extracted"><Sparkles size={10} className="text-muted-foreground" /></span>
      ) : null}
    </Label>
    <Input
      value={value}
      onChange={(e) => onChange(fieldKey, e.target.value)}
      placeholder={`Enter ${label.toLowerCase()}`}
      className="border-2 border-border focus:border-foreground"
    />
  </div>
);

const MyProfile = ({ documents }: MyProfileProps) => {
  const { profile, saveProfile, extractFromDocuments, isExtracting } = useProfileStorage();
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  const handleFieldChange = (key: string, value: string) => {
    setLocalProfile(prev => {
      if (key.startsWith('currentAddress.')) {
        const addressKey = key.split('.')[1] as keyof typeof prev.currentAddress;
        return {
          ...prev,
          currentAddress: {
            ...prev.currentAddress,
            [addressKey]: value,
          },
        };
      }
      return { ...prev, [key]: value };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    const changedFields: string[] = [];
    
    // Compare and track changed fields
    Object.keys(localProfile).forEach(key => {
      if (key === 'currentAddress') {
        Object.keys(localProfile.currentAddress).forEach(addrKey => {
          const fullKey = `currentAddress.${addrKey}`;
          if (localProfile.currentAddress[addrKey as keyof typeof localProfile.currentAddress] !== 
              profile.currentAddress[addrKey as keyof typeof profile.currentAddress]) {
            changedFields.push(fullKey);
          }
        });
      } else if (key !== 'lastUpdated' && key !== 'manuallyEditedFields') {
        if ((localProfile as any)[key] !== (profile as any)[key]) {
          changedFields.push(key);
        }
      }
    });

    saveProfile(localProfile, changedFields);
    setHasChanges(false);
    toast.success('Profile saved');
  };

  const handleRefreshFromDocuments = async () => {
    if (documents.length === 0) {
      toast.error('No documents in vault to extract from');
      return;
    }

    toast.info('Extracting information from your documents...');
    
    try {
      const documentTexts = documents
        .filter(doc => doc.ocrText)
        .map(doc => doc.ocrText);

      if (documentTexts.length === 0) {
        toast.error('No document text available for extraction');
        return;
      }

      await extractFromDocuments(documentTexts);
      toast.success('Profile updated from documents');
    } catch (error) {
      toast.error('Failed to extract profile information');
    }
  };

  const isManuallyEdited = (field: string) => profile.manuallyEditedFields.includes(field);

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black flex items-center gap-3">
            <User size={32} />
            My Profile
          </h2>
          <p className="text-muted-foreground font-mono text-sm">
            Personal information extracted from your documents
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleRefreshFromDocuments}
            disabled={isExtracting || documents.length === 0}
            variant="outline"
            className="border-4 border-foreground font-bold"
          >
            <RefreshCw size={18} className={isExtracting ? 'animate-spin' : ''} />
            {isExtracting ? 'Extracting...' : 'Refresh from Docs'}
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleSave}
              className="border-4 border-primary font-bold"
            >
              <Save size={18} />
              Save Changes
            </Button>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="text-xs font-mono text-muted-foreground p-3 border-2 border-border mb-6 bg-muted/30">
        <p className="flex items-center gap-2">
          <FileText size={14} />
          Your profile is stored locally on your device and never uploaded to any server.
        </p>
      </div>

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">Personal Information</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">Basic identity details</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label="First Name"
                value={localProfile.firstName}
                fieldKey="firstName"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('firstName')}
              />
              <ProfileField
                label="Last Name"
                value={localProfile.lastName}
                fieldKey="lastName"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('lastName')}
              />
            </div>
            <ProfileField
              label="Date of Birth"
              value={localProfile.dateOfBirth}
              fieldKey="dateOfBirth"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('dateOfBirth')}
            />
            <ProfileField
              label="Nationality"
              value={localProfile.nationality}
              fieldKey="nationality"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('nationality')}
            />
            <ProfileField
              label="Place of Birth"
              value={localProfile.placeOfBirth}
              fieldKey="placeOfBirth"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('placeOfBirth')}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">Contact Information</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">How to reach you</p>
          
          <div className="space-y-4">
            <ProfileField
              label="Email"
              value={localProfile.email}
              fieldKey="email"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('email')}
            />
            <ProfileField
              label="Phone"
              value={localProfile.phone}
              fieldKey="phone"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('phone')}
            />
            <ProfileField
              label="Street Address"
              value={localProfile.currentAddress.street}
              fieldKey="currentAddress.street"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('currentAddress.street')}
            />
            <div className="grid grid-cols-3 gap-4">
              <ProfileField
                label="City"
                value={localProfile.currentAddress.city}
                fieldKey="currentAddress.city"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('currentAddress.city')}
              />
              <ProfileField
                label="Province"
                value={localProfile.currentAddress.province}
                fieldKey="currentAddress.province"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('currentAddress.province')}
              />
              <ProfileField
                label="CAP"
                value={localProfile.currentAddress.postalCode}
                fieldKey="currentAddress.postalCode"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('currentAddress.postalCode')}
              />
            </div>
          </div>
        </div>

        {/* Document Numbers */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">Document Numbers</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">Official identification</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label="Passport Number"
                value={localProfile.passportNumber}
                fieldKey="passportNumber"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('passportNumber')}
              />
              <ProfileField
                label="Passport Expiry"
                value={localProfile.passportExpiry}
                fieldKey="passportExpiry"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('passportExpiry')}
              />
            </div>
            <ProfileField
              label="Codice Fiscale"
              value={localProfile.codiceFiscale}
              fieldKey="codiceFiscale"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('codiceFiscale')}
            />
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label="Permesso Number"
                value={localProfile.permessoNumber}
                fieldKey="permessoNumber"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('permessoNumber')}
              />
              <ProfileField
                label="Permesso Expiry"
                value={localProfile.permessoExpiry}
                fieldKey="permessoExpiry"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('permessoExpiry')}
              />
            </div>
          </div>
        </div>

        {/* Work & Study */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">Work & Study</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">Employment and education</p>
          
          <div className="space-y-4">
            <ProfileField
              label="Employer"
              value={localProfile.employer}
              fieldKey="employer"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('employer')}
            />
            <ProfileField
              label="Occupation"
              value={localProfile.occupation}
              fieldKey="occupation"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('occupation')}
            />
            <ProfileField
              label="University"
              value={localProfile.university}
              fieldKey="university"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('university')}
            />
            <ProfileField
              label="Study Program"
              value={localProfile.studyProgram}
              fieldKey="studyProgram"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('studyProgram')}
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      {profile.lastUpdated && (
        <p className="text-xs font-mono text-muted-foreground mt-6 text-center">
          Last updated: {new Date(profile.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default MyProfile;
