import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.tsx';
import { Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function Orders() {
  const { dbUser, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api-v2/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
           const data = await res.json();
           setOrders(data);
        } else {
           console.error("Failed to fetch orders");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  if (loading) return <div className="p-12 text-center text-slate-400">Loading orders...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-white mb-6 flex items-center">
        <Package className="mr-3 text-cyan-400" /> {t('Order History')}
      </h1>
      
      {orders.length === 0 ? (
        <div className="text-center p-12 bg-slate-800 rounded-2xl border border-slate-700">
          <p className="text-slate-400 text-lg">{t('No orders found.')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-slate-800 border border-slate-700 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Order #{order.id}</p>
                <p className="text-lg font-semibold text-white mt-1">${parseFloat(order.totalAmount).toFixed(2)}</p>
                <p className="text-sm text-slate-500 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full flex items-center gap-1 ${
                  order.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 
                  order.status === 'pending' ? 'bg-amber-100 text-amber-700' : 
                  'bg-slate-100 text-slate-700'
                }`}>
                  {order.status === 'paid' && <CheckCircle className="w-4 h-4" />}
                  {order.status === 'pending' && <Clock className="w-4 h-4" />}
                  {order.status === 'cancelled' && <XCircle className="w-4 h-4" />}
                  {order.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
