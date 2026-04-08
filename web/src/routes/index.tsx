import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <>
      <h1>Home</h1>
      <ul>
        <li>
          <Link to="/mapbuilder">Map Builder</Link>
        </li>
      </ul>
    </>
  );
}
