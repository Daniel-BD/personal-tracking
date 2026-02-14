import { Home, List, BookOpen, BarChart3, Settings, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
	home: Home,
	list: List,
	book: BookOpen,
	chart: BarChart3,
	settings: Settings,
};

export default function NavIcon({ icon }: { icon: string }) {
	const Icon = icons[icon];
	if (!Icon) return null;
	return <Icon className="w-6 h-6" strokeWidth={1.5} />;
}
