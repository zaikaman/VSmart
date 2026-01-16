export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-gray-600">Chào mừng đến với VSmart!</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="font-semibold text-lg mb-2">Tổng Dự Án</h3>
          <p className="text-3xl font-bold">-</p>
        </div>
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="font-semibold text-lg mb-2">Tasks Đang Làm</h3>
          <p className="text-3xl font-bold">-</p>
        </div>
        <div className="border rounded-lg p-6 bg-white">
          <h3 className="font-semibold text-lg mb-2">Tasks Hoàn Thành</h3>
          <p className="text-3xl font-bold">-</p>
        </div>
      </div>
    </div>
  );
}
