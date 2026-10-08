import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, CircleAlert, LockKeyhole, Sparkles } from "lucide-react";
import { SURVEY_GROUPS, SurveyOptionId, countWords } from "@shared/survey";
import { trpc } from "@/lib/trpc";

const INITIAL_MESSAGE = "Select every sense that arrived with you.";

type FeedbackTone = "neutral" | "success" | "error";

export default function Home() {
  const resultsQuery = trpc.survey.getResults.useQuery(undefined, {
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
  const submitMutation = trpc.survey.submit.useMutation();
  const [selected, setSelected] = useState<SurveyOptionId[]>([]);
  const [otherText, setOtherText] = useState("");
  const [feedback, setFeedback] = useState({ tone: "neutral" as FeedbackTone, message: INITIAL_MESSAGE });
  const [submittedLocally, setSubmittedLocally] = useState(false);

  const wordCount = useMemo(() => countWords(otherText), [otherText]);
  const otherSelected = selected.includes("other");
  const alreadySubmitted = Boolean(resultsQuery.data?.hasSubmitted || submittedLocally);
  const showResults = alreadySubmitted && Boolean(resultsQuery.data);
  const counts = resultsQuery.data?.counts ?? {};
  const maxCount = Math.max(1, ...Object.values(counts).map(value => Number(value) || 0));
  const totalResponses = Number(counts.viewWithoutColour ?? 0) + Number(counts.viewWithColour ?? 0) + Number(counts.sound ?? 0) + Number(counts.smell ?? 0) + Number(counts.taste ?? 0) + Number(counts.touchWetness ?? 0) + Number(counts.touchTemperature ?? 0) + Number(counts.touchRoughness ?? 0) + Number(counts.other ?? 0);

  function toggleOption(optionId: SurveyOptionId) {
    if (alreadySubmitted) return;
    setSelected(current => current.includes(optionId) ? current.filter(id => id !== optionId) : [...current, optionId]);
    setFeedback({ tone: "neutral", message: INITIAL_MESSAGE });
  }

  function validate() {
    if (selected.length === 0) {
      setFeedback({ tone: "error", message: "Choose at least one sense before sending your response." });
      return false;
    }
    if (otherSelected && !otherText.trim()) {
      setFeedback({ tone: "error", message: "Add a short note so we know what your Other sense was." });
      return false;
    }
    if (wordCount > 100) {
      setFeedback({ tone: "error", message: "That note is over 100 words. Let the dream breathe, but keep it concise." });
      return false;
    }
    return true;
  }

  async function submit() {
    if (alreadySubmitted) {
      setFeedback({ tone: "error", message: "This network has already shared a dream. Each visitor may submit only once." });
      return;
    }
    if (!validate()) return;

    setFeedback({ tone: "neutral", message: "Saving your dream trace…" });
    try {
      await submitMutation.mutateAsync({
        selectedOptions: selected,
        otherText: otherSelected ? otherText : undefined,
      });
      setSubmittedLocally(true);
      setFeedback({ tone: "success", message: "Your dream trace is now part of the archive." });
      await resultsQuery.refetch();
    } catch (error) {
      const code = (error as { data?: { code?: string } }).data?.code;
      if (code === "CONFLICT") {
        setSubmittedLocally(true);
        setFeedback({ tone: "error", message: "This network has already shared a dream. Each visitor may submit only once." });
        await resultsQuery.refetch();
      } else {
        setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Something went quiet. Please try again." });
      }
    }
  }

  return (
    <main className="site-shell">
      <div className="star-field" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <header className="site-header page-width">
        <a className="wordmark" href="/" aria-label="Dream Pulse home">
          <span className="wordmark-mark"><span>D</span><span>P</span></span>
          <span className="wordmark-copy"><strong>DREAM</strong><em>PULSE</em></span>
        </a>
        <div className="header-note"><span className="pulse-dot" /> Anonymous archive · 01</div>
      </header>

      <section className="hero page-width">
        <div className="hero-rail">
          <span className="rail-line" />
          <span className="rail-label">A FIELD NOTE<br />FROM SLEEP</span>
        </div>
        <div className="hero-copy">
          <p className="eyebrow"><Sparkles size={14} /> THE DREAM PULSE ARCHIVE</p>
          <h1>What have you<br /><em>experienced</em><br />in your dreams?</h1>
          <p className="hero-intro">A small archive of sleeping minds. Tell us which senses crossed the threshold with you — there are no wrong answers.</p>
        </div>
        <div className="hero-stamp" aria-hidden="true">
          <span>∞</span>
          <small>ONE<br />SHARED<br />NIGHT</small>
        </div>
      </section>

      <section className="workspace page-width" aria-label="Dream experience survey">
        <aside className="aside-note">
          <div className="aside-index">01<span>/01</span></div>
          <p>Choose all that feel familiar. Your answer is anonymous and can be sent only once from this network.</p>
          <div className="privacy-note"><LockKeyhole size={14} /> IP is hashed before storage</div>
        </aside>

        <div className="survey-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">THE SENSORY INDEX</p>
              <h2>Which signals made it through?</h2>
            </div>
            <span className="response-count">{alreadySubmitted ? "ARCHIVED" : "MULTI-SELECT"}</span>
          </div>

          <div className="option-groups">
            {SURVEY_GROUPS.map(group => (
              <div className={`option-group ${group.id === "other" ? "option-group-other" : ""}`} key={group.id}>
                <div className="group-heading">
                  <span className="group-number">{group.number}</span>
                  <div><h3>{group.label}</h3><p>{group.description}</p></div>
                </div>
                <div className={`option-list ${group.options.length > 1 ? "option-list-split" : ""}`}>
                  {group.options.map(option => {
                    const isSelected = selected.includes(option.id as SurveyOptionId);
                    return (
                      <button
                        className={`sense-option ${isSelected ? "is-selected" : ""}`}
                        type="button"
                        key={option.id}
                        aria-pressed={isSelected}
                        disabled={alreadySubmitted}
                        onClick={() => toggleOption(option.id as SurveyOptionId)}
                      >
                        <span className="option-check">{isSelected ? <Check size={15} strokeWidth={3} /> : <span />}</span>
                        <span className="option-text"><strong>{option.label}</strong><small>{option.note}</small></span>
                        <ChevronDown size={15} className="option-arrow" />
                      </button>
                    );
                  })}
                </div>
                {group.id === "other" && otherSelected && (
                  <div className="other-field-wrap">
                    <label htmlFor="other-response">Name the unexpected sense</label>
                    <textarea
                      id="other-response"
                      value={otherText}
                      disabled={alreadySubmitted}
                      maxLength={800}
                      onChange={event => setOtherText(event.target.value)}
                      placeholder="A pressure in the room, a colour with no name…"
                      rows={3}
                    />
                    <div className={`word-meter ${wordCount > 100 ? "is-over" : ""}`}><span>{wordCount} / 100 words</span><span>{wordCount > 100 ? "Too long" : "Keep it close to the feeling"}</span></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="submit-row">
            <div className={`feedback feedback-${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
              {feedback.tone === "error" ? <CircleAlert size={16} /> : feedback.tone === "success" ? <Check size={16} /> : <span className="feedback-mark">✦</span>}
              <span>{feedback.message}</span>
            </div>
            <button className="submit-button" type="button" onClick={submit} disabled={submitMutation.isPending || alreadySubmitted}>
              <span>{submitMutation.isPending ? "Saving…" : alreadySubmitted ? "Response archived" : "Submit response"}</span>
              {!alreadySubmitted && <ArrowUpRight size={19} />}
            </button>
          </div>
        </div>
      </section>

      {showResults && (
        <section className="results page-width" aria-label="Dream pulse results">
          <div className="results-header">
            <div><p className="section-kicker">THE COLLECTIVE ECHO</p><h2>What the archive is hearing</h2></div>
            <div className="results-total"><strong>{totalResponses}</strong><span>signals<br />recorded</span></div>
          </div>
          <div className="results-layout">
            <div className="count-list">
              {SURVEY_GROUPS.flatMap(group => group.options.map(option => ({ group, option }))).map(({ group, option }, index) => {
                const count = Number(counts[option.id as keyof typeof counts] ?? 0);
                const displayLabel = group.id === "view" || group.id === "touch" ? `${group.label} – ${option.label}` : option.label;
                return (
                  <div className="count-row" key={option.id}>
                    <span className="count-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="count-label"><span>{displayLabel}</span><div className="count-track"><span style={{ width: `${Math.max(count ? 5 : 0, Math.round((count / maxCount) * 100))}%` }} /></div></div>
                    <strong>{count}</strong>
                  </div>
                );
              })}
            </div>
            <div className="echoes">
              <div className="echoes-heading"><h3>Other signals</h3><span>{resultsQuery.data?.otherResponses.length ?? 0} notes</span></div>
              {resultsQuery.data?.otherResponses.length ? (
                <div className="bubble-cloud">
                  {resultsQuery.data.otherResponses.map((response, index) => <div className={`echo-bubble bubble-${index % 5}`} key={`${response}-${index}`}>{response}</div>)}
                </div>
              ) : (
                <div className="empty-echo"><span>✦</span><p>No unnamed signals yet.<br />Perhaps yours was the first.</p></div>
              )}
            </div>
          </div>
          <p className="results-footnote">Counts reflect selections, so one response can add a signal to more than one sense.</p>
        </section>
      )}

      <footer className="site-footer page-width"><span>Dream Pulse / anonymous, collective, unfinished</span><span>Built for the in-between</span></footer>
    </main>
  );
}
