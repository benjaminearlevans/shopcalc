import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  getPreferenceValues,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { ExtensionPreferences, FractionPrecision, ProjectProfile, ToolContext, ToleranceMode, Unit } from "../types";
import { deleteProfile, getActiveProfileId, getProfiles, setActiveProfile, upsertProfile } from "../utils/profiles";

interface ProfileFormValues {
  name: string;
  description: string;
  unit: Unit;
  fractionPrecision: string;
  kerfWidth: string;
  toleranceMode: ToleranceMode;
  toolContext: ToolContext;
}

export default function ProfilesCommand() {
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const { push } = useNavigation();
  const { data: profiles = [], isLoading, revalidate } = useCachedPromise(getProfiles, [prefs]);
  const { data: activeProfileId } = useCachedPromise(getActiveProfileId, []);

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0],
    [profiles, activeProfileId],
  );

  async function activate(profile: ProjectProfile) {
    await setActiveProfile(profile.id);
    await showToast({ style: Toast.Style.Success, title: `Active profile: ${profile.name}` });
    await revalidate();
  }

  async function remove(profile: ProjectProfile) {
    const confirmed = await confirmAlert({
      title: `Delete profile "${profile.name}"?`,
      message: "Commands will fall back to your next available profile.",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) {
      return;
    }

    await deleteProfile(profile.id, prefs);
    await showToast({ style: Toast.Style.Success, title: "Profile deleted" });
    await revalidate();
  }

  function openCreate() {
    push(
      <ProfileForm
        title="Create Profile"
        onSubmit={async (values) => {
          const profile = await upsertProfile(
            {
              id: "",
              ...values,
              fractionPrecision: Number(values.fractionPrecision) as FractionPrecision,
              kerfWidth: Number(values.kerfWidth),
            },
            prefs,
          );
          await setActiveProfile(profile.id);
          await showToast({ style: Toast.Style.Success, title: `Created profile "${profile.name}"` });
          await revalidate();
        }}
      />,
    );
  }

  function openEdit(profile: ProjectProfile) {
    push(
      <ProfileForm
        title={`Edit ${profile.name}`}
        defaultValues={{
          name: profile.name,
          description: profile.description ?? "",
          unit: profile.unit,
          fractionPrecision: String(profile.fractionPrecision),
          kerfWidth: String(profile.kerfWidth),
          toleranceMode: profile.toleranceMode,
          toolContext: profile.toolContext,
        }}
        onSubmit={async (values) => {
          await upsertProfile(
            {
              ...profile,
              ...values,
              fractionPrecision: Number(values.fractionPrecision) as FractionPrecision,
              kerfWidth: Number(values.kerfWidth),
            },
            prefs,
          );
          await showToast({ style: Toast.Style.Success, title: `Updated "${profile.name}"` });
          await revalidate();
        }}
      />,
    );
  }

  function duplicate(profile: ProjectProfile) {
    push(
      <ProfileForm
        title={`Duplicate ${profile.name}`}
        defaultValues={{
          name: `${profile.name} Copy`,
          description: profile.description ?? "",
          unit: profile.unit,
          fractionPrecision: String(profile.fractionPrecision),
          kerfWidth: String(profile.kerfWidth),
          toleranceMode: profile.toleranceMode,
          toolContext: profile.toolContext,
        }}
        onSubmit={async (values) => {
          await upsertProfile(
            {
              id: "",
              ...values,
              fractionPrecision: Number(values.fractionPrecision) as FractionPrecision,
              kerfWidth: Number(values.kerfWidth),
            },
            prefs,
          );
          await showToast({ style: Toast.Style.Success, title: `Duplicated "${profile.name}"` });
          await revalidate();
        }}
      />,
    );
  }

  if (!profiles.length && !isLoading) {
    return <List isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profiles">
      {activeProfile ? (
        <List.Section title="Active Profile">
          <List.Item
            key={activeProfile.id}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
            title={activeProfile.name}
            subtitle={activeProfile.description}
            accessories={[
              { tag: activeProfile.unit },
              { tag: `1/${activeProfile.fractionPrecision}"` },
              { tag: activeProfile.toleranceMode },
            ]}
            actions={
              <ActionPanel>
                <Action title="Edit Profile" icon={Icon.Pencil} onAction={() => openEdit(activeProfile)} />
                <Action title="Duplicate Profile" icon={Icon.CopyClipboard} onAction={() => duplicate(activeProfile)} />
                <Action
                  title="New Profile"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={openCreate}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
      <List.Section title="All Profiles">
        {profiles.map((profile) => (
          <List.Item
            key={profile.id}
            icon={
              profile.id === activeProfileId
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : { source: Icon.Person, tintColor: Color.SecondaryText }
            }
            title={profile.name}
            subtitle={profile.description}
            accessories={[{ tag: profile.unit }, { tag: `${profile.kerfWidth} kerf` }, { tag: profile.toleranceMode }]}
            actions={
              <ActionPanel>
                <Action title="Set Active" onAction={() => activate(profile)} />
                <Action title="Edit Profile" icon={Icon.Pencil} onAction={() => openEdit(profile)} />
                <Action title="Duplicate Profile" icon={Icon.CopyClipboard} onAction={() => duplicate(profile)} />
                <Action
                  title="Delete Profile"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => remove(profile)}
                />
                <Action
                  title="New Profile"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={openCreate}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ProfileForm({
  title,
  defaultValues,
  onSubmit,
}: {
  title: string;
  defaultValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
}) {
  const { pop } = useNavigation();
  const prefs = getPreferenceValues<ExtensionPreferences>();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [description, setDescription] = useState(defaultValues?.description ?? "");
  const [unit, setUnit] = useState<Unit>(defaultValues?.unit ?? (prefs.defaultUnit as Unit) ?? "inches");
  const [fractionPrecision, setFractionPrecision] = useState(
    defaultValues?.fractionPrecision ?? prefs.fractionPrecision ?? "16",
  );
  const [kerfWidth, setKerfWidth] = useState(defaultValues?.kerfWidth ?? prefs.kerfWidth ?? "0.125");
  const [toleranceMode, setToleranceMode] = useState<ToleranceMode>(defaultValues?.toleranceMode ?? "standard");
  const [toolContext, setToolContext] = useState<ToolContext>(defaultValues?.toolContext ?? "none");

  async function submit() {
    if (!name.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Profile name is required" });
      return;
    }

    const kerf = Number(kerfWidth);
    if (!Number.isFinite(kerf) || kerf <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Kerf must be a positive number" });
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      unit,
      fractionPrecision,
      kerfWidth,
      toleranceMode,
      toolContext,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action title="Save Profile" onAction={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Profile Name" value={name} onChange={setName} autoFocus />
      <Form.TextArea
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
        placeholder="Example: Kitchen face-frame cabinetry defaults"
      />
      <Form.Dropdown id="unit" title="Default Unit" value={unit} onChange={(value) => setUnit(value as Unit)}>
        <Form.Dropdown.Item value="inches" title="Inches" />
        <Form.Dropdown.Item value="mm" title="Millimeters" />
        <Form.Dropdown.Item value="cm" title="Centimeters" />
      </Form.Dropdown>
      <Form.Dropdown
        id="fractionPrecision"
        title="Fraction Precision"
        value={fractionPrecision}
        onChange={setFractionPrecision}
      >
        <Form.Dropdown.Item value="8" title={'1/8"'} />
        <Form.Dropdown.Item value="16" title={'1/16"'} />
        <Form.Dropdown.Item value="32" title={'1/32"'} />
        <Form.Dropdown.Item value="64" title={'1/64"'} />
      </Form.Dropdown>
      <Form.TextField id="kerfWidth" title="Kerf Width" value={kerfWidth} onChange={setKerfWidth} placeholder="0.125" />
      <Form.Dropdown
        id="toleranceMode"
        title="Tolerance Mode"
        value={toleranceMode}
        onChange={(value) => setToleranceMode(value as ToleranceMode)}
      >
        <Form.Dropdown.Item value="tight" title="Tight (fewer gaps)" />
        <Form.Dropdown.Item value="standard" title="Standard" />
        <Form.Dropdown.Item value="loose" title="Loose (easier assembly)" />
      </Form.Dropdown>
      <Form.Dropdown
        id="toolContext"
        title="Preferred Safety Context"
        value={toolContext}
        onChange={(value) => setToolContext(value as ToolContext)}
      >
        <Form.Dropdown.Item value="none" title="None" />
        <Form.Dropdown.Item value="router" title="Router" />
        <Form.Dropdown.Item value="table-saw" title="Table Saw" />
        <Form.Dropdown.Item value="drill" title="Drill" />
        <Form.Dropdown.Item value="pocket-screw" title="Pocket Screw" />
      </Form.Dropdown>
    </Form>
  );
}
