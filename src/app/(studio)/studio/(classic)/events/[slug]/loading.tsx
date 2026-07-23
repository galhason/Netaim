/*
 * Event workspace loading: the event header and its area tabs held by
 * skeletons while the surface resolves.
 */
const WorkspaceLoading = () => (
  <div className="flex flex-col gap-8">
    <div className="flex flex-col gap-3">
      <div className="skeleton h-px w-16" />
      <div className="skeleton h-9 w-64" />
      <div className="skeleton h-4 w-48" />
    </div>
    <div className="flex gap-6 border-b border-border pb-3">
      <div className="skeleton h-5 w-16" />
      <div className="skeleton h-5 w-20" />
      <div className="skeleton h-5 w-16" />
      <div className="skeleton h-5 w-24" />
    </div>
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="skeleton h-16 w-40" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-12 w-full" />
    </div>
  </div>
);

export default WorkspaceLoading;
