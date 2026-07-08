import { PageHeader } from "@/components/ui";
import AssistantChat from "@/components/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <PageHeader title="entiquity Assistant"
        description="Ask questions across your entities and documents. Answers cite their sources and never constitute legal advice." />
      <AssistantChat />
    </div>
  );
}
