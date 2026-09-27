import { redirect } from 'next/navigation';

/*
 * The canvas workspace lived here: the platform's own page in a frame,
 * a scene strip beside it. The public site is WordPress now and the
 * frame showed a page nobody visits, so the conference is edited as
 * sections at /studio/conference/{slug}. Old links and bookmarks land
 * there.
 */
const RetiredCanvasWorkspace = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  redirect(`/studio/conference/${slug}/content`);
};

export default RetiredCanvasWorkspace;
