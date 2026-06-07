import React, { useMemo, useState } from 'react';
import { AppNotification, Artwork } from '../types';
import { X, Search, Clock, Info, Trash2, Download, CheckSquare, Square } from 'lucide-react';
import { getNotificationIconAndStyle } from './Header';

interface NotificationsModalProps {
  notifications: AppNotification[];
  onClose: () => void;
  onSelect: (notification: AppNotification) => void;
  onDeleteNotifications?: (ids: string[]) => void;
  artworks?: Artwork[];
}

const NotificationsModal: React.FC<NotificationsModalProps> = ({ notifications, onClose, onSelect, onDeleteNotifications, artworks = [] }) => {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const availableAgents = useMemo(() => {
    const agents = new Set<string>();
    notifications.forEach(n => {
      if (n.agent) agents.add(n.agent);
      if (n.userName) agents.add(n.userName);
    });
    return Array.from(agents).sort();
  }, [notifications]);

  const availableYears = useMemo(() => {
    const years = new Set(notifications.map(n => new Date(n.timestamp).getFullYear().toString()));
    const currentYear = new Date().getFullYear();
    // Always show at least the last 5 years for navigation
    for (let i = 0; i < 5; i++) {
      years.add((currentYear - i).toString());
    }
    return Array.from(years).sort((a: string, b: string) => b.localeCompare(a));
  }, [notifications]);

  const filtered = useMemo(() => {
    let list = notifications;

    // Filter by Year
    if (selectedYear) {
      list = list.filter(n => new Date(n.timestamp).getFullYear().toString() === selectedYear);
    }

    // Filter by Month
    if (selectedMonth) {
      list = list.filter(n => new Date(n.timestamp).getMonth().toString() === selectedMonth);
    }

    // Filter by Day
    if (selectedDay) {
      list = list.filter(n => new Date(n.timestamp).getDate().toString() === selectedDay);
    }

    // Filter by Agent
    if (selectedAgent) {
      list = list.filter(n => (n.agent === selectedAgent) || (n.userName === selectedAgent));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [notifications, search, selectedYear, selectedMonth, selectedDay]);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(e.target.value);
    setSelectedIds([]);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(e.target.value);
    setSelectedIds([]);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDay(e.target.value);
    setSelectedIds([]);
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedAgent(e.target.value);
    setSelectedIds([]);
  };

  const getTimeLabel = (timestamp: string) => {
    const d = new Date(timestamp);
    return d.toLocaleString();
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(n => n.id));
    }
  };

  const handleExportSelected = () => {
    const logsToExport = notifications.filter(n => selectedIds.includes(n.id));
    if (logsToExport.length === 0) return;

    const csvContent = "data:text/csv;charset=utf-8," 
       + "Date,Type,Title,Message\n"
       + logsToExport.map(n => {
           const date = new Date(n.timestamp).toLocaleString().replace(/,/g, '');
           const message = n.message.replace(/"/g, '""').replace(/\n/g, ' ');
           return `"${date}","${n.type}","${n.title}","${message}"`;
       }).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `activity_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
 };

 const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} logs? This action cannot be undone.`)) {
        onDeleteNotifications?.(selectedIds);
        setSelectedIds([]);
    }
 };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-900/80 backdrop-blur-md p-8 md:p-12">
      <div className="bg-white w-full max-w-3xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50 shrink-0">
          <div>
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em]">Notifications</p>
            <h2 className="text-lg font-black text-neutral-900">Activity History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-none bg-white text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 border border-neutral-200 transition-all hover:scale-105 hover:shadow-md active:scale-95"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-neutral-100 space-y-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title or message..."
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-none text-xs font-bold uppercase tracking-wider text-neutral-800 placeholder-neutral-400 focus:bg-white focus:border-neutral-900 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <select
                  value={selectedYear}
                  onChange={handleYearChange}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-none px-3 py-2 pr-8 text-xs font-black uppercase tracking-widest text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 appearance-none bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:12px] bg-no-repeat cursor-pointer transition-all"
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-none px-3 py-2 pr-8 text-xs font-black uppercase tracking-widest text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 appearance-none bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:12px] bg-no-repeat cursor-pointer transition-all"
                >
                  <option value="">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i.toString()}>
                      {new Date(0, i).toLocaleString('default', { month: 'short' }).toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedDay}
                  onChange={handleDayChange}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-none px-3 py-2 pr-8 text-xs font-black uppercase tracking-widest text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 appearance-none bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:12px] bg-no-repeat cursor-pointer transition-all"
                >
                  <option value="">All Days</option>
                  {Array.from({ length: 31 }, (_, i) => (
                    <option key={i + 1} value={(i + 1).toString()}>{i + 1}</option>
                  ))}
                </select>

                <select
                  value={selectedAgent}
                  onChange={handleAgentChange}
                  className="w-full bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-none px-3 py-2 pr-8 text-xs font-black uppercase tracking-widest text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 appearance-none bg-[image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-[size:12px] bg-no-repeat cursor-pointer transition-all"
                >
                  <option value="">All Agents</option>
                  {availableAgents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
            </div>

             {/* Bulk Actions */}
             {selectedIds.length > 0 && (
                <div className="flex items-center justify-between py-2 border-t border-neutral-100 mt-2 animate-in fade-in duration-200">
                    <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">{selectedIds.length} items selected</span>
                    <div className="flex items-center gap-2">
                      <button
                          onClick={handleExportSelected}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-none transition-colors text-xs font-bold uppercase tracking-wider"
                      >
                          <Download size={14} />
                          Export
                      </button>
                      {onDeleteNotifications && (
                          <button
                              onClick={handleDeleteSelected}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-none transition-colors text-xs font-bold uppercase tracking-wider"
                          >
                              <Trash2 size={14} />
                              Delete
                          </button>
                      )}
                    </div>
                </div>
             )}
          </div>
        </div>
        
        {/* Header Row with Select All */}
        {filtered.length > 0 && (
            <div className="px-6 py-2 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-3 shrink-0">
                 <button
                    onClick={handleSelectAll}
                    className="p-1 rounded-none hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors"
                    title={selectedIds.length === filtered.length ? "Deselect All" : "Select All"}
                 >
                    {selectedIds.length === filtered.length && filtered.length > 0 ? (
                        <CheckSquare size={18} className="text-neutral-900" />
                    ) : (
                        <Square size={18} />
                    )}
                 </button>
                 <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Select All</span>
            </div>
        )}

        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-neutral-400 text-sm">
              No notifications found for this view.
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {filtered.map((n) => {
                const isSelected = selectedIds.includes(n.id);
                return (
                    <div 
                    key={n.id} 
                    className={`w-full text-left px-6 py-4 flex items-start gap-3 transition-colors ${isSelected ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}
                    >
                     <button
                        onClick={(e) => handleToggleSelect(n.id, e)}
                        className="mt-2 p-1 rounded-none hover:bg-neutral-200 text-neutral-300 hover:text-neutral-500 transition-colors shrink-0"
                     >
                        {isSelected ? (
                            <CheckSquare size={18} className="text-neutral-900" />
                        ) : (
                            <Square size={18} />
                        )}
                     </button>

                    <button 
                        onClick={() => onSelect(n)}
                        className="flex-1 flex items-start gap-3 text-left min-w-0"
                    >
                        {(() => {
                          const art = n.artworkId ? artworks.find(a => String(a.id) === String(n.artworkId)) : null;
                          if (art && art.imageUrl) {
                            return (
                              <div className="w-8 h-8 rounded-none border border-neutral-200 overflow-hidden shrink-0 mt-1 shadow-sm">
                                <img src={art.imageUrl} className="w-full h-full object-cover" alt="" />
                              </div>
                            );
                          }
                           const style = getNotificationIconAndStyle(n.title, n.message, n.type);
                           return (
                             <div className={`mt-1 p-2 rounded-none shrink-0 border ${style.classes}`}>
                               {style.icon}
                             </div>
                           );
                        })()}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm font-bold truncate ${n.type === 'sales' ? 'text-red-700' : 'text-neutral-900'}`}>{n.title}</p>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-400 uppercase tracking-wider shrink-0">
                                <Clock size={10} />
                                <span>{getTimeLabel(n.timestamp)}</span>
                            </div>
                            </div>
                            <p className="mt-1 text-xs text-neutral-600 whitespace-pre-line">
                            {n.message}
                            </p>
                        </div>
                    </button>
                    </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsModal;
