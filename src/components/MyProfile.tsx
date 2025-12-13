import { useState, useEffect } from 'react';
import { User, RefreshCw, Save, FileText, Edit3, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
      placeholder={label}
      className="border-2 border-border focus:border-foreground"
    />
  </div>
);

const MyProfile = ({ documents }: MyProfileProps) => {
  const { t } = useTranslation();
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
    toast.success(t('profile.profileSaved'));
  };

  const handleRefreshFromDocuments = async () => {
    if (documents.length === 0) {
      toast.error(t('profile.noDocuments'));
      return;
    }

    toast.info(t('profile.extractingInfo'));
    
    try {
      const documentTexts = documents
        .filter(doc => doc.ocrText)
        .map(doc => doc.ocrText);

      if (documentTexts.length === 0) {
        toast.error(t('profile.noDocumentText'));
        return;
      }

      await extractFromDocuments(documentTexts);
      toast.success(t('profile.profileUpdated'));
    } catch (error) {
      toast.error(t('profile.extractFailed'));
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
            {t('profile.title')}
          </h2>
          <p className="text-muted-foreground font-mono text-sm">
            {t('profile.subtitle')}
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
            {isExtracting ? t('profile.extracting') : t('profile.refreshFromDocs')}
          </Button>
          
          {hasChanges && (
            <Button
              onClick={handleSave}
              className="border-4 border-primary font-bold"
            >
              <Save size={18} />
              {t('profile.saveChanges')}
            </Button>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="text-xs font-mono text-muted-foreground p-3 border-2 border-border mb-6 bg-muted/30">
        <p className="flex items-center gap-2">
          <FileText size={14} />
          {t('profile.privacyNotice')}
        </p>
      </div>

      {/* Profile Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">{t('profile.sections.personal')}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{t('profile.sections.personalDesc')}</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label={t('profile.fields.firstName')}
                value={localProfile.firstName}
                fieldKey="firstName"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('firstName')}
              />
              <ProfileField
                label={t('profile.fields.lastName')}
                value={localProfile.lastName}
                fieldKey="lastName"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('lastName')}
              />
            </div>
            <ProfileField
              label={t('profile.fields.dateOfBirth')}
              value={localProfile.dateOfBirth}
              fieldKey="dateOfBirth"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('dateOfBirth')}
            />
            <ProfileField
              label={t('profile.fields.nationality')}
              value={localProfile.nationality}
              fieldKey="nationality"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('nationality')}
            />
            <ProfileField
              label={t('profile.fields.placeOfBirth')}
              value={localProfile.placeOfBirth}
              fieldKey="placeOfBirth"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('placeOfBirth')}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card p-6 border-4 border-foreground shadow-md">
          <h3 className="font-bold text-lg mb-1">{t('profile.sections.contact')}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{t('profile.sections.contactDesc')}</p>
          
          <div className="space-y-4">
            <ProfileField
              label={t('profile.fields.email')}
              value={localProfile.email}
              fieldKey="email"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('email')}
            />
            <ProfileField
              label={t('profile.fields.phone')}
              value={localProfile.phone}
              fieldKey="phone"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('phone')}
            />
            <ProfileField
              label={t('profile.fields.streetAddress')}
              value={localProfile.currentAddress.street}
              fieldKey="currentAddress.street"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('currentAddress.street')}
            />
            <div className="grid grid-cols-3 gap-4">
              <ProfileField
                label={t('profile.fields.city')}
                value={localProfile.currentAddress.city}
                fieldKey="currentAddress.city"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('currentAddress.city')}
              />
              <ProfileField
                label={t('profile.fields.province')}
                value={localProfile.currentAddress.province}
                fieldKey="currentAddress.province"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('currentAddress.province')}
              />
              <ProfileField
                label={t('profile.fields.cap')}
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
          <h3 className="font-bold text-lg mb-1">{t('profile.sections.documents')}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{t('profile.sections.documentsDesc')}</p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label={t('profile.fields.passportNumber')}
                value={localProfile.passportNumber}
                fieldKey="passportNumber"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('passportNumber')}
              />
              <ProfileField
                label={t('profile.fields.passportExpiry')}
                value={localProfile.passportExpiry}
                fieldKey="passportExpiry"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('passportExpiry')}
              />
            </div>
            <ProfileField
              label={t('profile.fields.codiceFiscale')}
              value={localProfile.codiceFiscale}
              fieldKey="codiceFiscale"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('codiceFiscale')}
            />
            <div className="grid grid-cols-2 gap-4">
              <ProfileField
                label={t('profile.fields.permessoNumber')}
                value={localProfile.permessoNumber}
                fieldKey="permessoNumber"
                onChange={handleFieldChange}
                isManuallyEdited={isManuallyEdited('permessoNumber')}
              />
              <ProfileField
                label={t('profile.fields.permessoExpiry')}
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
          <h3 className="font-bold text-lg mb-1">{t('profile.sections.work')}</h3>
          <p className="text-xs font-mono text-muted-foreground mb-4">{t('profile.sections.workDesc')}</p>
          
          <div className="space-y-4">
            <ProfileField
              label={t('profile.fields.employer')}
              value={localProfile.employer}
              fieldKey="employer"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('employer')}
            />
            <ProfileField
              label={t('profile.fields.occupation')}
              value={localProfile.occupation}
              fieldKey="occupation"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('occupation')}
            />
            <ProfileField
              label={t('profile.fields.university')}
              value={localProfile.university}
              fieldKey="university"
              onChange={handleFieldChange}
              isManuallyEdited={isManuallyEdited('university')}
            />
            <ProfileField
              label={t('profile.fields.studyProgram')}
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
          {t('profile.lastUpdated')} {new Date(profile.lastUpdated).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default MyProfile;
