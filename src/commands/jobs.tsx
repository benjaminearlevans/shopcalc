import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { clearSavedJobs, compareRevisions, deleteSavedJob, getSavedJobs } from "../utils/jobs";

export default function JobsCommand() {
  const { push } = useNavigation();
  const { data: jobs = [], isLoading, revalidate } = useCachedPromise(getSavedJobs, []);

  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear all saved jobs?",
      message: "This removes all saved revisions and comparisons.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await clearSavedJobs();
    await showToast({ style: Toast.Style.Success, title: "Saved jobs cleared" });
    await revalidate();
  }

  async function remove(jobName: string) {
    const confirmed = await confirmAlert({
      title: `Delete "${jobName}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }
    await deleteSavedJob(jobName);
    await showToast({ style: Toast.Style.Success, title: `Deleted ${jobName}` });
    await revalidate();
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search saved jobs"
      actions={
        <ActionPanel>
          <Action title="Clear All Jobs" style={Action.Style.Destructive} icon={Icon.Trash} onAction={clearAll} />
        </ActionPanel>
      }
    >
      {!jobs.length && !isLoading ? (
        <List.EmptyView title="No saved jobs yet" description="Save result snapshots from calculator outputs." />
      ) : null}
      {jobs.map((job) => {
        const latest = job.revisions[0];
        const previous = job.revisions[1];
        if (!latest) {
          return null;
        }
        return (
          <List.Item
            key={job.jobName}
            icon={{ source: Icon.Box, tintColor: Color.Blue }}
            title={job.jobName}
            subtitle={latest?.summary.replace(/\*\*/g, "").split("\n")[0] ?? "No summary"}
            accessories={[
              { tag: `${job.revisions.length} rev` },
              latest ? { date: new Date(latest.timestamp) } : { text: "No date" },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Latest Revision"
                  onAction={() => {
                    push(
                      <Detail
                        markdown={[
                          `# ${job.jobName}`,
                          "",
                          `Latest revision: ${new Date(latest.timestamp).toLocaleString()}`,
                          "",
                          latest.summary,
                          "",
                          "```json",
                          JSON.stringify(latest.output, null, 2),
                          "```",
                        ].join("\n")}
                      />,
                    );
                  }}
                />
                {previous ? (
                  <Action
                    title="Compare Latest Two Revisions"
                    icon={Icon.Sidebar}
                    onAction={() => push(<Detail markdown={compareRevisions(previous, latest)} />)}
                  />
                ) : null}
                <Action.CopyToClipboard title="Copy Latest Revision JSON" content={JSON.stringify(latest, null, 2)} />
                <Action
                  title="Delete Job"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => remove(job.jobName)}
                />
                <Action title="Clear All Jobs" style={Action.Style.Destructive} icon={Icon.Trash} onAction={clearAll} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
