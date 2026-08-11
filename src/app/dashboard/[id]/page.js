export default async function DashboardDetailPage({ params }) {
  const { id } = await params;

  return <h1>Dashboard {id}</h1>;
}
