import { redirect } from 'next/navigation';

/* The workspace opens on its content. */
const ConferenceIndex = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  redirect(`/studio/conference/${slug}/content`);
};

export default ConferenceIndex;
