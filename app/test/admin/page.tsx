"use client";

import { useMemo, useState } from "react";
import styles from "./test-admin.module.css";

const sections = [
  { id: "hero", label: "Hero Copy", icon: "✨", count: 3 },
  { id: "quest", label: "Daily Quest", icon: "📝", count: 24 },
  { id: "minigame", label: "Mini-game", icon: "🎮", count: 8 },
  { id: "reward", label: "Reward Shop", icon: "🎁", count: 7 },
  { id: "calendar", label: "Calendar", icon: "📅", count: 5 },
  { id: "grants", label: "Grants", icon: "💗", count: 2 },
] as const;

const contentQueue = [
  { type: "Hero", title: "Jaga mood pelan-pelan", status: "Active", meta: "Dashboard" },
  { type: "Quest", title: "Tiny reflection", status: "Scheduled", meta: "Hari ini" },
  { type: "Reward", title: "Voice note penyemangat", status: "Active", meta: "45 Hearts" },
  { type: "Calendar", title: "Birthday countdown", status: "Special", meta: "25 Mei" },
];

const pendingRequests = [
  { title: "Request surat panjang", user: "Awa", status: "Pending", cost: "120 Hearts" },
  { title: "Streak Shield", user: "Awa", status: "Pending", cost: "90 Hearts" },
];

type SectionId = (typeof sections)[number]["id"];

export default function TestAdminDashboard() {
  const [activeSection, setActiveSection] = useState<SectionId>("hero");
  const [heroTitle, setHeroTitle] = useState("Jaga mood, kumpulin Hearts, dan rawat garden pelan-pelan.");
  const [heroBody, setHeroBody] = useState("Hari ini cukup isi mood dulu. Quest dan reward bisa menyusul setelahnya.");

  const activeMeta = useMemo(
    () => sections.find((section) => section.id === activeSection) ?? sections[0],
    [activeSection],
  );

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span>💞</span>
          <div>
            <strong>BirthdayAwa</strong>
            <small>Admin Studio</small>
          </div>
        </div>

        <nav className={styles.nav}>
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={activeSection === section.id ? styles.navActive : styles.navItem}
              onClick={() => setActiveSection(section.id)}
            >
              <span>{section.icon}</span>
              <strong>{section.label}</strong>
              <em>{section.count}</em>
            </button>
          ))}
        </nav>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.eyebrow}>Content cockpit</p>
            <h1>{activeMeta.label}</h1>
          </div>
          <div className={styles.topActions}>
            <button type="button" className={styles.iconAction} aria-label="Preview user" title="Preview user">👁️</button>
            <button type="button" className={styles.iconActionPrimary} aria-label="Publish" title="Publish">🚀</button>
          </div>
        </header>

        <section className={styles.summaryGrid}>
          <Metric icon="💗" label="Hearts granted" value="186" />
          <Metric icon="🔥" label="Current streak" value="14 hari" />
          <Metric icon="🎁" label="Pending reward" value="2" />
          <Metric icon="🗓️" label="Scheduled" value="6" />
        </section>

        <section className={styles.editorLayout}>
          <div className={styles.editorColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>{activeMeta.icon} Editor</p>
                  <h2>{activeMeta.label}</h2>
                </div>
                <span className={styles.statePill}>Draft autosaved</span>
              </div>

              {activeSection === "hero" && (
                <HeroEditor
                  title={heroTitle}
                  body={heroBody}
                  onTitleChange={setHeroTitle}
                  onBodyChange={setHeroBody}
                />
              )}

              {activeSection === "quest" && <QuestEditor />}
              {activeSection === "minigame" && <MiniGameEditor />}
              {activeSection === "reward" && <RewardEditor />}
              {activeSection === "calendar" && <CalendarEditor />}
              {activeSection === "grants" && <GrantEditor />}
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Approval</p>
                  <h2>Reward requests</h2>
                </div>
              </div>
              <div className={styles.requestList}>
                {pendingRequests.map((request) => (
                  <article key={request.title} className={styles.requestRow}>
                    <div>
                      <strong>{request.title}</strong>
                      <span>{request.user} · {request.cost}</span>
                    </div>
                    <div className={styles.rowActions}>
                      <button type="button" className={styles.iconReject} aria-label={`Reject ${request.title}`} title="Reject">
                        ❌
                      </button>
                      <button type="button" className={styles.iconApprove} aria-label={`Approve ${request.title}`} title="Approve">
                        ✅
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className={styles.previewColumn}>
            <section className={styles.previewHero}>
              <p className={styles.eyebrow}>Live preview</p>
              <h2>{heroTitle}</h2>
              <p>{heroBody}</p>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.eyebrow}>Queue</p>
                  <h2>Content aktif</h2>
                </div>
              </div>
              <div className={styles.queueList}>
                {contentQueue.map((item) => (
                  <article key={`${item.type}-${item.title}`} className={styles.queueItem}>
                    <span>{item.type}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <small>{item.meta}</small>
                    </div>
                    <em>{item.status}</em>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <article className={styles.metric}>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function HeroEditor({
  title,
  body,
  onTitleChange,
  onBodyChange,
}: {
  title: string;
  body: string;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
}) {
  return (
    <div className={styles.formGrid}>
      <label>
        <span>Headline</span>
        <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
      </label>
      <label>
        <span>Supporting text</span>
        <textarea value={body} onChange={(event) => onBodyChange(event.target.value)} rows={4} />
      </label>
      <div className={styles.formSplit}>
        <label>
          <span>Tone</span>
          <select defaultValue="soft">
            <option>soft</option>
            <option>playful</option>
            <option>romantic</option>
            <option>birthday</option>
          </select>
        </label>
        <label>
          <span>Active date</span>
          <input type="date" />
        </label>
      </div>
    </div>
  );
}

function QuestEditor() {
  return (
    <div className={styles.formGrid}>
      <label><span>Quest title</span><input defaultValue="Tiny reflection" /></label>
      <label><span>Prompt</span><textarea rows={4} defaultValue="Apa satu hal kecil yang bikin hari ini terasa lebih baik?" /></label>
      <div className={styles.formSplit}>
        <label><span>XP</span><input type="number" defaultValue={8} /></label>
        <label><span>Hearts</span><input type="number" defaultValue={3} /></label>
      </div>
    </div>
  );
}

function MiniGameEditor() {
  return (
    <div className={styles.formGrid}>
      <label><span>Mini-game title</span><input defaultValue="Guess the date" /></label>
      <label><span>Prompt</span><textarea rows={3} defaultValue="Tanggal berapa movie night pertama kita?" /></label>
      <div className={styles.formSplit}>
        <label><span>XP reward</span><input type="number" defaultValue={20} /></label>
        <label><span>Hearts reward</span><input type="number" defaultValue={5} /></label>
      </div>
    </div>
  );
}

function RewardEditor() {
  return (
    <div className={styles.formGrid}>
      <label><span>Reward title</span><input defaultValue="Voice note penyemangat" /></label>
      <label><span>Description</span><textarea rows={3} defaultValue="Admin kirim voice note manis setelah request diapprove." /></label>
      <div className={styles.formSplit}>
        <label><span>Cost Hearts</span><input type="number" defaultValue={45} /></label>
        <label><span>Category</span><input defaultValue="experience" /></label>
      </div>
    </div>
  );
}

function CalendarEditor() {
  return (
    <div className={styles.formGrid}>
      <label><span>Event title</span><input defaultValue="Movie night" /></label>
      <label><span>Description</span><textarea rows={3} defaultValue="Quality time kecil setelah aktivitas hari ini." /></label>
      <div className={styles.formSplit}>
        <label><span>Date</span><input type="date" /></label>
        <label><span>Type</span><input defaultValue="custom" /></label>
      </div>
    </div>
  );
}

function GrantEditor() {
  return (
    <div className={styles.formGrid}>
      <label><span>Grant type</span><select defaultValue="hearts"><option>hearts</option><option>streak shield</option><option>forgiveness ticket</option></select></label>
      <label><span>Amount</span><input type="number" defaultValue={10} /></label>
      <label><span>Admin note</span><textarea rows={3} defaultValue="Bonus kecil dari admin." /></label>
    </div>
  );
}
