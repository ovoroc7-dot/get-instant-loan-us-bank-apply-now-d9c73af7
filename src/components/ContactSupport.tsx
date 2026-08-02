import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Headset, Loader2, Mail, MessageSquare, Paperclip, Phone, X } from "lucide-react";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const SUPPORT_PHONE = "+1-985-602-3749";
export const SUPPORT_EMAIL = "Shellymurray074@gmail.com";

const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const LINK_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function supportTelHref() {
  return `tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`;
}

function supportMailHref(subject: string, body: string) {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(body)}`;
}

/** Contact cards for phone and email support. */
export function ContactSupportCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <a
        href={supportTelHref()}
        className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-accent/5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Phone className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Call us</p>
          <p className="text-sm text-muted-foreground">{SUPPORT_PHONE}</p>
        </div>
      </a>

      <a
        href={supportMailHref("Support enquiry", "Hi, I need help with my account.")}
        className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] transition-colors hover:bg-accent/5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
          <Mail className="h-5 w-5 text-accent" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Email us</p>
          <p className="text-sm text-muted-foreground">{SUPPORT_EMAIL}</p>
        </div>
      </a>
    </div>
  );
}

/** Full support section with contact cards and an enquiry/complaint form. */
export function ContactSupport() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > MAX_FILE_BYTES);
    if (tooBig) {
      toast.error(`"${tooBig.name}" is larger than 10 MB.`);
      return;
    }
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of incoming) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      if (merged.length > MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        return merged.slice(0, MAX_FILES);
      }
      return merged;
    });
    if (fileInput.current) fileInput.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadAttachments(): Promise<string[]> {
    if (files.length === 0) return [];
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) throw new Error("You need to be signed in to attach files.");

    const links: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${userId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("support-attachments")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const { data: signed, error: signError } = await supabase.storage
        .from("support-attachments")
        .createSignedUrl(path, LINK_TTL_SECONDS);
      if (signError || !signed) throw signError ?? new Error("Could not create a file link.");
      links.push(`${file.name}: ${signed.signedUrl}`);
    }
    return links;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || !message.trim()) {
      toast.error("Please fill in the subject and message.");
      return;
    }
    setUploading(true);
    try {
      const links = await uploadAttachments();
      const body =
        links.length > 0
          ? `${message}\n\nAttached proof (links valid for 30 days):\n${links.join("\n")}`
          : message;
      window.location.href = supportMailHref(topic, body);
      toast.success("Opening your email app…", {
        description:
          links.length > 0
            ? "Your files were uploaded and linked in the message."
            : "Send the message to our support team.",
      });
    } catch (err) {
      toast.error("Could not upload your attachments.", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <ContactSupportCards />

      <form
        onSubmit={submit}
        className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
      >
        <div className="mb-4 flex items-center gap-2">
          <Headset className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground">Send an enquiry or complaint</h3>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="support-topic">Subject</Label>
            <Input
              id="support-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Loan disbursement question"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="support-message">Message</Label>
            <Textarea
              id="support-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your enquiry or complaint in detail…"
              rows={4}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-files">Attachments (optional)</Label>
            <input
              ref={fileInput}
              id="support-files"
              type="file"
              multiple
              accept="image/*,application/pdf,.doc,.docx,.txt"
              className="sr-only"
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Add proof (images, PDF)
            </Button>
            <p className="text-xs text-muted-foreground">
              Up to {MAX_FILES} files, 10 MB each. Files are uploaded securely and included
              as private links in your email.
            </p>
            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${i}`}
                    className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {f.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      aria-label={`Remove ${f.name}`}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={uploading}>
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading attachments…" : "Email support team"}
          </Button>
        </div>
      </form>
    </div>
  );
}
