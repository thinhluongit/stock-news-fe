'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchStocks } from '../../../store/slices/stockSlice';
import { useLocale } from '../../../i18n/LocaleContext';
import { stockApi } from '../../../services/api';
import { Pencil, Trash2, Check, X, Plus, Loader2 } from 'lucide-react';

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <p className="text-gray-900 dark:text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStocksPage() {
  const dispatch = useAppDispatch();
  const { t } = useLocale();
  const { stocks, loading } = useAppSelector((s) => s.stocks);

  const [deleteSymbol, setDeleteSymbol] = useState<string | null>(null);
  const [opLoading, setOpLoading]       = useState(false);

  // Add form
  const [addSymbol, setAddSymbol]       = useState('');
  const [addCompany, setAddCompany]     = useState('');
  const [addExchange, setAddExchange]   = useState('');
  const [addSector, setAddSector]       = useState('');
  const [addPrice, setAddPrice]         = useState('');
  const [adding, setAdding]             = useState(false);
  const [addError, setAddError]         = useState('');

  // Inline price edit
  const [priceEditSymbol, setPriceEditSymbol] = useState<string | null>(null);
  const [priceEditValue, setPriceEditValue]   = useState('');
  const [priceSaving, setPriceSaving]         = useState(false);

  const reload = () => dispatch(fetchStocks(undefined));

  useEffect(() => { reload(); }, []);

  const handleAdd = async () => {
    if (!addSymbol.trim() || !addCompany.trim()) return;
    setAdding(true);
    setAddError('');
    try {
      await stockApi.create({
        symbol: addSymbol.trim().toUpperCase(),
        company_name: addCompany.trim(),
        exchange: addExchange.trim() || undefined,
        sector: addSector.trim() || undefined,
        current_price: addPrice ? parseFloat(addPrice) : undefined,
      });
      setAddSymbol('');
      setAddCompany('');
      setAddExchange('');
      setAddSector('');
      setAddPrice('');
      reload();
    } catch {
      setAddError(t('admin.error_load'));
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteSymbol) return;
    setOpLoading(true);
    try {
      await stockApi.remove(deleteSymbol);
      setDeleteSymbol(null);
      reload();
    } catch { /* handled */ }
    finally { setOpLoading(false); }
  };

  const startPriceEdit = (symbol: string, currentPrice?: number) => {
    setPriceEditSymbol(symbol);
    setPriceEditValue(currentPrice?.toString() ?? '');
  };

  const savePriceEdit = async (symbol: string) => {
    setPriceSaving(true);
    try {
      await stockApi.updatePrice(symbol, { current_price: parseFloat(priceEditValue) });
      setPriceEditSymbol(null);
      reload();
    } catch { /* handled */ }
    finally { setPriceSaving(false); }
  };

  const formatPrice = (price?: number) =>
    price !== undefined && price !== null ? `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

  const formatChange = (pct?: number) => {
    if (pct === undefined || pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {deleteSymbol && (
        <ConfirmDialog
          message={t('admin.actions.confirm_delete')}
          onConfirm={handleDelete}
          onCancel={() => setDeleteSymbol(null)}
        />
      )}

      <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('admin.stocks')}</h1>

      {/* Add form */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('admin.stock.add_new')}</h2>
        {addError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-xs">{addError}</div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.stock.symbol')} *</label>
            <input
              type="text"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.stock.company')} *</label>
            <input
              type="text"
              value={addCompany}
              onChange={(e) => setAddCompany(e.target.value)}
              placeholder="Apple Inc."
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.stock.exchange')}</label>
            <input
              type="text"
              value={addExchange}
              onChange={(e) => setAddExchange(e.target.value)}
              placeholder="NASDAQ"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.stock.sector')}</label>
            <input
              type="text"
              value={addSector}
              onChange={(e) => setAddSector(e.target.value)}
              placeholder="Technology"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">{t('admin.stock.price')}</label>
            <input
              type="number"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={!addSymbol.trim() || !addCompany.trim() || adding}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            {t('admin.actions.add')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-green-400" size={24} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('admin.stock.symbol')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('admin.stock.company')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">{t('admin.stock.exchange')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden md:table-cell">{t('admin.stock.sector')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">{t('admin.stock.price')}</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium hidden lg:table-cell">{t('admin.stock.change')}</th>
                  <th className="px-4 py-3 text-gray-600 dark:text-gray-400 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {stocks.map((s) => (
                  <tr key={s.symbol} className="hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-900 dark:text-white">{s.symbol}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{s.company_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden sm:table-cell">{s.exchange ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{s.sector ?? '—'}</td>
                    <td className="px-4 py-3">
                      {priceEditSymbol === s.symbol ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={priceEditValue}
                            onChange={(e) => setPriceEditValue(e.target.value)}
                            min="0"
                            step="0.01"
                            autoFocus
                            className="w-24 bg-gray-100 dark:bg-gray-800 border border-green-500 rounded px-2 py-1 text-xs text-gray-900 dark:text-white focus:outline-none"
                          />
                          <button
                            onClick={() => savePriceEdit(s.symbol)}
                            disabled={priceSaving}
                            className="p-1 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded transition-colors"
                          >
                            {priceSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          </button>
                          <button
                            onClick={() => setPriceEditSymbol(null)}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startPriceEdit(s.symbol, s.current_price)}
                          className="text-gray-900 dark:text-white hover:text-green-400 transition-colors"
                          title={t('admin.stock.update_price')}
                        >
                          {formatPrice(s.current_price)}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={
                        s.price_change_pct === undefined || s.price_change_pct === null ? 'text-gray-500' :
                        s.price_change_pct >= 0 ? 'text-green-400' : 'text-red-400'
                      }>
                        {formatChange(s.price_change_pct)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => startPriceEdit(s.symbol, s.current_price)}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title={t('admin.stock.update_price')}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteSymbol(s.symbol)}
                          disabled={opLoading}
                          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40"
                          title={t('admin.actions.delete')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {stocks.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-500 py-8 text-sm">{t('admin.no_stocks')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
