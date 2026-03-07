import { useParams, Navigate } from 'react-router-dom';

export default function ItemDetailPage() {
	const { itemId } = useParams<{ itemId: string }>();

	if (!itemId) return <Navigate to="/log" replace />;

	return <Navigate to={`/stats/item/${itemId}`} replace />;
}
