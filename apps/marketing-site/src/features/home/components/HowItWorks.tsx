const STEPS = [
  { title: "Create a profile", description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
  { title: "Get verified", description: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." },
  { title: "Start matching", description: "Ut enim ad minim veniam, quis nostrud exercitation ullamco." },
];

/**
 * Homepage "how it works" steps section.
 */
export function HowItWorks() {
  return (
    <section style={{ padding: "48px 24px" }}>
      <h2>How it works</h2>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {STEPS.map((step) => (
          <div key={step.title} style={{ flex: 1, minWidth: 200 }}>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
