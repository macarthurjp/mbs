import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {title}
          </p>
          <p className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent mb-2">
            {value}
          </p>
          <p className="text-sm text-gray-600">
            {subtitle}
          </p>
        </div>
        <div className={`${iconColor} p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}
