import React, { useEffect, useState } from 'react';
import { ExternalLink, Users, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Leads() {
  const { t } = useTranslation();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api-v2/public/partners')
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) {
           setPartners(data);
         } else {
           console.error("Failed to load partners", data);
           setPartners([]);
         }
         setLoading(false);
      })
      .catch((err) => {
         console.error("Failed to fetch partners", err);
         setPartners([]);
         setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight font-display text-slate-100 tracking-tight flex items-center gap-3">
           <Users className="w-10 h-10 text-[#ffcc00]" />
           {t('Leads turning into affiliates')}
        </h1>
        <p className="text-lg text-slate-400 mt-2">
          {t('Discover the top companies, retailers, and communities joining our ecosystem.')}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">{t('Loading directory...')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {partners.map((partner, idx) => (
            <div key={idx} className="bg-slate-800 rounded-xl shadow-none border border-slate-700 p-6 hover:shadow-none transition-shadow flex flex-col gap-3">
              <div>
                <h3 className="font-semibold tracking-tight text-xl text-slate-100 mb-1 truncate" title={partner.name}>
                  {partner.name || t('Unknown Company')}
                </h3>
                {partner.location && (
                  <p className="text-sm font-medium text-slate-400">{partner.location}</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700">
                  <span className="text-sm font-semibold text-slate-400">{t('Contacted')}</span>
                  <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-700">
                  <span className="text-sm font-semibold text-slate-400">{t('Registered')}</span>
                  {partner.signedUp ? (
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-700 text-[#ffcc00]">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-slate-800 text-slate-400">
                       <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {partners.length === 0 && (
             <div className="col-span-full py-10 text-center text-slate-400">{t('No partners found.')}</div>
          )}
        </div>
      )}
    </div>
  );
}
