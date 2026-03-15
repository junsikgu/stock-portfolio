export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-56 mt-2" />
        </div>
        <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-24" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="h-10 bg-gray-50 dark:bg-gray-700" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-14 border-t border-gray-50 dark:border-gray-700 px-4 flex items-center gap-4">
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-16" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-12" />
            <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-20 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
