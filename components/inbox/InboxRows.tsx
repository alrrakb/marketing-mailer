import { memo } from 'react';
import { Eye, Trash2 } from 'lucide-react';

export type InboxMessage = {
    id: string;
    sender: string;
    subject: string;
    content: string;
    received_at: string;
    is_read: boolean;
    tags?: string[];
};

interface InboxRowProps {
    message: InboxMessage;
    isSelected: boolean;
    isSelectionMode: boolean;
    onToggleSelect: (id: string) => void;
    onOpen: (msg: InboxMessage) => void;
    onDelete: (id: string) => void;
}

const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
        date: date.toLocaleDateString(),
        time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
};

export const DesktopMessageRow = memo(function DesktopMessageRow({
    message: msg,
    isSelected,
    isSelectionMode,
    onToggleSelect,
    onOpen,
    onDelete
}: InboxRowProps) {
    const { date, time } = formatDate(msg.received_at);

    return (
        <tr
            className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : (!msg.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : '')}`}
            onClick={() => onOpen(msg)}
        >
            {isSelectionMode && (
                <td className="px-6 py-4 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                        checked={isSelected}
                        onChange={() => onToggleSelect(msg.id)}
                    />
                </td>
            )}
            <td className="px-6 py-4 max-w-xs truncate">
                <div className={`font-medium ${!msg.is_read ? 'text-[#39285e] dark:text-[#79bbe0] font-bold' : 'text-gray-900 dark:text-white'}`}>
                    {msg.sender.split('<')[0]}
                </div>
                <div className="text-xs text-gray-400 truncate">{msg.sender}</div>
            </td>
            <td className="px-6 py-4 max-w-sm">
                <div className={`${!msg.is_read ? 'font-bold' : ''} text-gray-800 dark:text-gray-200 truncate`}>
                    {msg.subject}
                </div>
                {msg.tags && msg.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                        {msg.tags.map(t => (
                            <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] uppercase tracking-wider">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
            </td>
            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                {date}
                <span className="text-xs ml-1 opacity-70 block">
                    {time}
                </span>
            </td>
            <td className="px-6 py-4 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <button
                    onClick={() => onOpen(msg)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                    <Eye className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(msg.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
});

export const MobileMessageCard = memo(function MobileMessageCard({
    message: msg,
    isSelected,
    isSelectionMode,
    onToggleSelect,
    onOpen,
    onDelete
}: InboxRowProps) {
    const { date } = formatDate(msg.received_at);

    return (
        <div
            className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer active:scale-[0.99] ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : (!msg.is_read ? 'bg-blue-50/30 dark:bg-blue-900/10' : '')}`}
            onClick={() => onOpen(msg)}
        >
            <div className="flex items-start gap-3 mb-1">
                {isSelectionMode && (
                    <div onClick={e => e.stopPropagation()} className="animate-in fade-in duration-200 min-w-[24px] flex items-center justify-center p-1 -ml-1">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-[#39285e] focus:ring-[#39285e]"
                            checked={isSelected}
                            onChange={() => onToggleSelect(msg.id)}
                        />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className={`font-medium truncate ${!msg.is_read ? 'text-[#39285e] dark:text-[#79bbe0] font-bold' : 'text-gray-900 dark:text-white'}`}>
                                {msg.sender.split('<')[0]}
                            </div>
                            <div className="text-xs text-gray-400 truncate">{msg.sender}</div>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {date}
                        </span>
                    </div>

                    <div className={`text-sm my-2 ${!msg.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {msg.subject}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="flex gap-1 overflow-auto no-scrollbar mask-gradient">
                            {msg.tags && msg.tags.map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-[10px] uppercase tracking-wider whitespace-nowrap">
                                    {t}
                                </span>
                            ))}
                        </div>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                                onClick={() => onOpen(msg)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            >
                                <Eye className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => onDelete(msg.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
