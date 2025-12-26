export default function Loading() {
  return (
    <div className="flex-1 flex flex-col w-full px-4 py-4">
      <div className="mb-4">
        <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2"></div>
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
          </div>
          <div className="text-right">
            <div className="h-4 w-24 bg-slate-200 rounded animate-pulse mb-2"></div>
            <div className="h-8 w-32 bg-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-white border rounded-lg p-4">
        <div className="h-4 w-full bg-slate-200 rounded animate-pulse mb-4"></div>
        <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-4"></div>
        <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse"></div>
      </div>
    </div>
  );
}
