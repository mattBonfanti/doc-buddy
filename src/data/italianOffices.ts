export interface ItalianOffice {
  id: string;
  name: string;
  category: 'immigration' | 'tax' | 'health' | 'local' | 'consular' | 'other';
  description: string;
  emailHint: string;
}

export const ITALIAN_OFFICES: ItalianOffice[] = [
  {
    id: 'questura',
    name: 'Questura (Immigration Office)',
    category: 'immigration',
    description: 'Handles permesso di soggiorno, visas, and residence permits',
    emailHint: 'Find your local Questura email at poliziadistato.it',
  },
  {
    id: 'prefettura',
    name: 'Prefettura',
    category: 'immigration',
    description: 'Prefecture office for citizenship and administrative matters',
    emailHint: 'Find your local Prefettura at prefettura.[city].it',
  },
  {
    id: 'comune',
    name: 'Comune (Municipality)',
    category: 'local',
    description: 'Handles residency registration, certificates, and local services',
    emailHint: 'Find your Comune at comune.[city].it',
  },
  {
    id: 'agenzia-entrate',
    name: 'Agenzia delle Entrate',
    category: 'tax',
    description: 'Tax office for codice fiscale and tax matters',
    emailHint: 'Contact via agenziaentrate.gov.it',
  },
  {
    id: 'asl',
    name: 'ASL (Local Health Authority)',
    category: 'health',
    description: 'Handles tessera sanitaria and healthcare enrollment',
    emailHint: 'Find your ASL at the regional health website',
  },
  {
    id: 'inps',
    name: 'INPS',
    category: 'tax',
    description: 'Social security and pension services',
    emailHint: 'Contact via inps.it',
  },
  {
    id: 'motorizzazione',
    name: 'Motorizzazione Civile',
    category: 'other',
    description: 'Driver license conversion and vehicle registration',
    emailHint: 'Find your office at ilportaledellautomobilista.it',
  },
  {
    id: 'consolato',
    name: 'Consulate/Embassy',
    category: 'consular',
    description: 'Your home country consulate or embassy',
    emailHint: 'Search for "[country] consulate [city]"',
  },
  {
    id: 'other',
    name: 'Other Office',
    category: 'other',
    description: 'Enter a custom office email address',
    emailHint: 'Enter the email manually',
  },
];

export const getCategoryLabel = (category: ItalianOffice['category']): string => {
  const labels: Record<ItalianOffice['category'], string> = {
    immigration: 'Immigration',
    tax: 'Tax & Finance',
    health: 'Healthcare',
    local: 'Local Government',
    consular: 'Consular',
    other: 'Other',
  };
  return labels[category];
};

export const suggestOfficeByTopic = (text: string): ItalianOffice | null => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('permesso') || lowerText.includes('visa') || lowerText.includes('soggiorno')) {
    return ITALIAN_OFFICES.find(o => o.id === 'questura') || null;
  }
  if (lowerText.includes('cittadinanza') || lowerText.includes('citizenship')) {
    return ITALIAN_OFFICES.find(o => o.id === 'prefettura') || null;
  }
  if (lowerText.includes('residenza') || lowerText.includes('residence') || lowerText.includes('anagrafe')) {
    return ITALIAN_OFFICES.find(o => o.id === 'comune') || null;
  }
  if (lowerText.includes('codice fiscale') || lowerText.includes('tax')) {
    return ITALIAN_OFFICES.find(o => o.id === 'agenzia-entrate') || null;
  }
  if (lowerText.includes('tessera sanitaria') || lowerText.includes('health') || lowerText.includes('doctor')) {
    return ITALIAN_OFFICES.find(o => o.id === 'asl') || null;
  }
  if (lowerText.includes('driver') || lowerText.includes('license') || lowerText.includes('patente')) {
    return ITALIAN_OFFICES.find(o => o.id === 'motorizzazione') || null;
  }
  if (lowerText.includes('pension') || lowerText.includes('inps')) {
    return ITALIAN_OFFICES.find(o => o.id === 'inps') || null;
  }
  
  return null;
};
