import React from "react";
import { useNavigate } from "react-router-dom";
import MobileBottomNav from "../mobile/MobileBottomNav";
import useIsDesktop from "../hooks/useIsDesktop";

export default function AboutUs() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();

  const story = [
    {
      heading: "Bringing your everyday needs closer to home",
      paragraphs: [
        "ShiperBox started with a simple observation: getting fresh vegetables, flowers for a special occasion, a custom garland made in time for a ceremony, or a package delivered across town shouldn't mean juggling five different apps, shops, and phone calls. We wanted one place that could handle all of it — reliably, quickly, and without the runaround.",
        "Today, ShiperBox is a local-first platform built around the things people in our community actually need on a regular basis: fresh groceries, flowers, custom garlands for festivals and functions, and dependable courier and delivery services. We're not trying to be everything to everyone — we're trying to be genuinely useful for the handful of things that matter most in daily life.",
      ],
    },
    {
      heading: "How it started",
      paragraphs: [
        "ShiperBox began as a small effort to solve a local problem. Vendors selling fresh vegetables and flowers had great produce but no easy way to reach customers beyond their immediate neighborhood. Customers, meanwhile, were stuck choosing between the inconvenience of visiting multiple shops or settling for less fresh options from generic delivery apps that treated groceries as an afterthought.",
        "We built ShiperBox to close that gap — to give local vendors a proper digital storefront, and to give customers a fast, honest way to get what they need without compromising on freshness or trust.",
        "From there, the platform grew naturally. Customers ordering flowers for weddings and festivals started asking for custom garlands — made to order, delivered on time, exactly as requested. So we added that. People needed small packages moved across town without waiting hours for a generalist courier service, so we built dedicated courier routes with transparent tracking. Every feature on ShiperBox exists because someone in our community actually asked for it.",
      ],
    },
    {
      heading: "What we do",
      paragraphs: [
        "Fresh groceries, delivered right. We work directly with local vegetable and flower vendors so what arrives at your door is as close to market-fresh as possible. No middlemen inflating prices, no produce sitting in a warehouse for days before it reaches you.",
        "Custom garlands, made with care. Whether it's for a wedding, a housewarming, a festival, or a religious ceremony, our garland service lets you send a reference photo and your requirements, and we handle the rest — sourced, made, and delivered by your needed date.",
        "Courier services that keep their word. We run structured delivery routes between key points in the city, so sending a package doesn't mean guessing when — or if — it'll arrive. Real-time status on your requests means no more calling around for updates.",
        "A cart that respects your time. Save your addresses once, reorder your regulars in seconds, and check out without re-entering the same details every time.",
      ],
    },
    {
      heading: "What we believe in",
      paragraphs: [
        "Trust over hype. We'd rather under-promise and consistently deliver than make big claims we can't back up. If something's out of stock, we say so. If a delivery will take longer, we tell you upfront.",
        "Local first. We prioritize working with vendors and partners in our own community rather than treating every city as an interchangeable market. That means better quality control, and it means the money customers spend actually supports people nearby.",
        "Simple should stay simple. Every addition to ShiperBox has to earn its place by solving a real, recurring problem — not just look good in a features list.",
        "Security and privacy as a baseline, not an afterthought. Your account, your orders, and your personal details are handled with the same care we'd want for our own information. We don't sell data, and we don't cut corners on how we protect it.",
      ],
    },
    {
      heading: "Who we serve",
      paragraphs: [
        "ShiperBox is built for people who want dependable, everyday services without friction — busy families ordering groceries for the week, someone arranging flowers for a last-minute occasion, a small business owner who needs a package couriered across town by afternoon, or a household preparing for a festival and needing a garland made exactly right. If that sounds like you, you're exactly who we built this for.",
      ],
    },
    {
      heading: "Where we're headed",
      paragraphs: [
        "We're still early, and we like it that way — it means we're still close enough to our customers to hear what's working and what isn't, and to change course quickly when something needs fixing. As we grow, our plan is to expand the range of local vendors we partner with, extend our courier network to cover more routes, and keep refining the experience based on what actual customers tell us, not what looks good on a roadmap slide.",
        "If you've got feedback, a request, or just want to tell us we got something wrong — we want to hear it. ShiperBox works because the people using it keep shaping what it becomes.",
      ],
    },
    {
      heading: "Thank you",
      paragraphs: [
        "To every vendor who trusted us with their produce and their reputation, to every customer who gave a new local service a chance instead of a familiar big name, and to everyone still discovering us for the first time — thank you for being part of building something genuinely useful, together.",
      ],
    },
  ];

  return (
    <div style={{ ...styles.page, ...(isDesktop && styles.pageDesktop) }}>
      <div style={isDesktop ? styles.cardDesktop : undefined}>
        <div style={{ ...styles.header, ...(isDesktop && styles.headerDesktop) }}>
          <button style={styles.backBtn} onClick={() => navigate(-1)} aria-label="Go back">←</button>
          <h2 style={styles.title}>About Us</h2>
        </div>

        <div style={{ ...styles.scrollArea, ...(isDesktop && styles.scrollAreaDesktop) }}>
          <div style={styles.heroCard}>
            <h1 style={styles.brand}>ShiperBox</h1>
          </div>

          <div style={styles.storyCard}>
            {story.map((block, i) => (
              <div key={i} style={i > 0 ? styles.storyBlock : undefined}>
                <h3 style={styles.storyHeading}>{block.heading}</h3>
                {block.paragraphs.map((p, j) => (
                  <p key={j} style={styles.storyText}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {!isDesktop && <MobileBottomNav />}
    </div>
  );
}

const styles = {
  page: { backgroundColor: "#f5f7fa", minHeight: "100vh" },
  pageDesktop: { display: "flex", justifyContent: "center", backgroundColor: "#eef1f5", padding: "40px 20px", boxSizing: "border-box" },
  cardDesktop: { width: "100%", maxWidth: "640px", background: "#fff", borderRadius: "20px", boxShadow: "0 10px 30px rgba(0,0,0,0.08)", overflow: "hidden", height: "fit-content" },
  header: { position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000, display: "flex", alignItems: "center", padding: "15px 30px", background: "#8ec5fc", color: "#fff", gap: "12px" },
  headerDesktop: { position: "static", borderRadius: "20px 20px 0 0" },
  backBtn: { border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "18px", cursor: "pointer", width: "34px", height: "34px", borderRadius: "10px" },
  title: { margin: "0 0 0 140px", fontSize: "20px", fontWeight: "700" },
  scrollArea: { padding: "96px 16px 95px" },
  scrollAreaDesktop: { padding: "24px" },
  heroCard: { background: "#8ec5fc", borderRadius: "18px", padding: "28px 20px", textAlign: "center", marginBottom: "18px", boxShadow: "0 10px 25px rgba(37,99,235,0.25)" },
  brand: { margin: 0, color: "#fff", fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px" },
  storyCard: { background: "#fff", borderRadius: "16px", padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
  storyBlock: { marginTop: "18px" },
  storyHeading: { margin: "0 0 8px", fontSize: "15px", color: "#111", fontWeight: "700" },
  storyText: { margin: "0 0 10px", fontSize: "13px", color: "#555", lineHeight: 1.7 },
};