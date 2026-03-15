export default function Loading() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 animate-pulse">
      <div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-64 mt-2" />
      </div>
      <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
    </div>
  )
}
