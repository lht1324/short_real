import os

file_path = "/Users/jaeho/Projects/Playground/short_real/components/page/workspace/autopilot/AutopilotConfigPanel.tsx"
with open(file_path, "r") as f:
    content = f.read()

import_statement = 'import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";\n'
content = content.replace('import {NICHE_DATA_LIST} from "@/lib/niches";', 'import {NICHE_DATA_LIST} from "@/lib/niches";\n' + import_statement)

old_interface = """interface AutopilotConfigPanelProps {
    autopilotName: string;
    setAutopilotName: (name: string) => void;
    topicMode: 'preset' | 'custom';
    setTopicMode: (mode: 'preset' | 'custom') => void;
    selectedNiche: string;
    setSelectedNiche: (nicheId: string) => void;
    customNiche: string;
    setCustomNiche: (niche: string) => void;
    voiceList: Voice[];
    isVoiceLoading: boolean;
    selectedVoiceId: string;
    setSelectedVoiceId: (id: string) => void;
}"""

new_interface = """interface AutopilotConfigPanelProps {
    currentSeries: AutopilotData;
    updateSeries: (updateData: Partial<AutopilotData>) => void;
    voiceList: Voice[];
    isVoiceLoading: boolean;
}"""

content = content.replace(old_interface, new_interface)

old_func = """function AutopilotConfigPanel({
    autopilotName,
    setAutopilotName,
    topicMode,
    setTopicMode,
    selectedNiche,
    setSelectedNiche,
    customNiche,
    setCustomNiche,
    voiceList,
    isVoiceLoading,
    selectedVoiceId,
    setSelectedVoiceId,
}: AutopilotConfigPanelProps) {"""

new_func = """function AutopilotConfigPanel({
    currentSeries,
    updateSeries,
    voiceList,
    isVoiceLoading,
}: AutopilotConfigPanelProps) {
    const topicMode = currentSeries.niche_preset_id ? 'preset' : 'custom';"""

content = content.replace(old_func, new_func)

content = content.replace('value={autopilotName}', 'value={currentSeries.name}')
content = content.replace('onChange={(e) => setAutopilotName(e.target.value)}', "onChange={(e) => updateSeries({ name: e.target.value })}")

content = content.replace("onClick={() => setTopicMode('preset')}", "onClick={() => updateSeries({ niche_preset_id: NICHE_DATA_LIST[0].uiMetadata.id, niche_value: NICHE_DATA_LIST[0].uiMetadata.label })}")
content = content.replace("onClick={() => setTopicMode('custom')}", "onClick={() => updateSeries({ niche_preset_id: undefined, niche_value: '' })}")

content = content.replace('selectedNiche === niche.uiMetadata.id', 'currentSeries.niche_preset_id === niche.uiMetadata.id')
content = content.replace('onClick={() => setSelectedNiche(niche.uiMetadata.id)}', "onClick={() => updateSeries({ niche_preset_id: niche.uiMetadata.id, niche_value: niche.uiMetadata.label })}")

content = content.replace('value={customNiche}', "value={currentSeries.niche_preset_id ? '' : currentSeries.niche_value}")
content = content.replace('onChange={(e) => setCustomNiche(e.target.value)}', "onChange={(e) => updateSeries({ niche_value: e.target.value })}")

content = content.replace('selectedVoiceId === voice.id', 'currentSeries.voice_id === voice.id')
content = content.replace('onClick={() => setSelectedVoiceId(voice.id)}', "onClick={() => updateSeries({ voice_id: voice.id })}")

with open(file_path, "w") as f:
    f.write(content)

file_path2 = "/Users/jaeho/Projects/Playground/short_real/components/page/workspace/autopilot/WorkspaceAutopilotPageClient.tsx"
with open(file_path2, "r") as f:
    content2 = f.read()

import_statement2 = 'import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";\n'
content2 = content2.replace('import { NICHE_DATA_LIST } from "@/lib/niches";', 'import { NICHE_DATA_LIST } from "@/lib/niches";\n' + import_statement2)

old_state = """    // --- Series Management (Dummy State) ---
    const [seriesList, setSeriesList] = useState([
        { id: '1', name: 'My New Series', isActive: true },
        { id: '2', name: 'Space Daily', isActive: false },
        { id: '3', name: 'My New Series', isActive: true },
        { id: '4', name: 'Space Daily', isActive: false },
    ]);
    const [currentSeriesId, setCurrentSeriesId] = useState('1');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const currentSeries = seriesList.find(s => s.id === currentSeriesId) || seriesList[0];

    // --- DB-related Core State (Managed by Parent) ---
    const [autopilotName, setAutopilotName] = useState('My New Series');
    const [topicMode, setTopicMode] = useState<'preset' | 'custom'>('preset');
    const [selectedNiche, setSelectedNiche] = useState(NICHE_DATA_LIST[0]?.uiMetadata?.id || 'space');
    const [customNiche, setCustomNiche] = useState('');
    const [selectedVoiceId, setSelectedVoiceId] = useState('');
    
    // Voice List (Fetched by Parent as it's common data)
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);

    // Platform & Scheduler State
    const [platforms, setPlatforms] = useState<Record<ExportPlatform, boolean>>({
        [ExportPlatform.YOUTUBE]: true,
        [ExportPlatform.TIKTOK]: false,
        [ExportPlatform.INSTAGRAM]: false,
    });
    const [scheduleMode, setScheduleMode] = useState<'weekly' | 'cron'>('weekly');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [scheduledHour, setScheduledHour] = useState(10);
    const [scheduledMinute, setScheduledMinute] = useState(0);
    const [cronExpression, setCronExpression] = useState('0 10 * * *');

    // System Status
    const [isActive, setIsActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);"""

new_state = """    // --- Series Management (Dummy State) ---
    const [seriesList, setSeriesList] = useState<AutopilotData[]>([
        {
            id: '1',
            user_id: 'user-1',
            name: 'My New Series',
            is_active: true,
            niche_preset_id: NICHE_DATA_LIST[0]?.uiMetadata?.id || 'space',
            niche_value: NICHE_DATA_LIST[0]?.uiMetadata?.label || 'Space Facts',
            voice_id: '',
            platforms: {
                [ExportPlatform.YOUTUBE]: true,
                [ExportPlatform.TIKTOK]: false,
                [ExportPlatform.INSTAGRAM]: false,
            },
            schedule_cron: '0 10 * * *',
        },
        {
            id: '2',
            user_id: 'user-1',
            name: 'History Daily',
            is_active: false,
            niche_preset_id: undefined,
            niche_value: 'Interesting history facts about the Roman Empire',
            voice_id: '',
            platforms: {
                [ExportPlatform.YOUTUBE]: true,
                [ExportPlatform.TIKTOK]: true,
                [ExportPlatform.INSTAGRAM]: false,
            },
            schedule_cron: '30 15 * * *',
        }
    ]);
    const [currentSeriesId, setCurrentSeriesId] = useState('1');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const currentSeries = seriesList.find(s => s.id === currentSeriesId) || seriesList[0];

    const updateCurrentSeries = useCallback((updateData: Partial<AutopilotData>) => {
        setSeriesList(prev => prev.map(s => s.id === currentSeriesId ? { ...s, ...updateData } : s));
    }, [currentSeriesId]);

    // Voice List (Fetched by Parent as it's common data)
    const [voiceList, setVoiceList] = useState<Voice[]>([]);
    const [isVoiceLoading, setIsVoiceLoading] = useState(true);

    // Platform & Scheduler State (Mock state for Cron until implementation)
    const [scheduleMode, setScheduleMode] = useState<'weekly' | 'cron'>('weekly');
    const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [scheduledHour, setScheduledHour] = useState(10);
    const [scheduledMinute, setScheduledMinute] = useState(0);

    // System Status
    const [isSaving, setIsSaving] = useState(false);"""

content2 = content2.replace(old_state, new_state)

old_effect = """                if (voices.length > 0 && !selectedVoiceId) setSelectedVoiceId(voices[0].id);
            } catch (error) {
                console.error("Failed to load voices", error);
            } finally {
                setIsVoiceLoading(false);
            }
        };
        fetchVoices();
    }, [selectedVoiceId]);"""

new_effect = """                // Do not auto-set voice ID here, let the series handle it or keep default.
            } catch (error) {
                console.error("Failed to load voices", error);
            } finally {
                setIsVoiceLoading(false);
            }
        };
        fetchVoices();
    }, []);"""

content2 = content2.replace(old_effect, new_effect)

old_toggle_active = """    const onClickToggleActive = useCallback(() => {
        setIsActive(prev => !prev);
    }, []);"""

new_toggle_active = """    const onClickToggleActive = useCallback(() => {
        updateCurrentSeries({ is_active: !currentSeries.is_active });
    }, [currentSeries.is_active, updateCurrentSeries]);"""

content2 = content2.replace(old_toggle_active, new_toggle_active)

old_toggle_platform = """    const onTogglePlatform = useCallback((platform: ExportPlatform) => {
        setPlatforms(prev => ({ ...prev, [platform]: !prev[platform] }));
    }, []);"""

new_toggle_platform = """    const onTogglePlatform = useCallback((platform: ExportPlatform) => {
        updateCurrentSeries({ 
            platforms: { ...currentSeries.platforms, [platform]: !currentSeries.platforms[platform] } 
        });
    }, [currentSeries.platforms, updateCurrentSeries]);"""

content2 = content2.replace(old_toggle_platform, new_toggle_platform)

content2 = content2.replace('series.isActive', 'series.is_active')
content2 = content2.replace('currentSeries?.isActive', 'currentSeries?.is_active')

old_panel = """                <AutopilotConfigPanel 
                    autopilotName={autopilotName}
                    setAutopilotName={setAutopilotName}
                    topicMode={topicMode}
                    setTopicMode={setTopicMode}
                    selectedNiche={selectedNiche}
                    setSelectedNiche={setSelectedNiche}
                    customNiche={customNiche}
                    setCustomNiche={setCustomNiche}
                    voiceList={voiceList}
                    isVoiceLoading={isVoiceLoading}
                    selectedVoiceId={selectedVoiceId}
                    setSelectedVoiceId={setSelectedVoiceId}
                />

                {/* Right Control Panel */}
                <AutopilotControlPanel 
                    isActive={isActive}
                    onClickToggleActive={onClickToggleActive}
                    platforms={platforms}
                    onTogglePlatform={onTogglePlatform}
                    scheduleMode={scheduleMode}
                    setScheduleMode={setScheduleMode}
                    selectedDays={selectedDays}
                    onToggleDay={onToggleDay}
                    scheduledHour={scheduledHour}
                    setScheduledHour={setScheduledHour}
                    scheduledMinute={scheduledMinute}
                    setScheduledMinute={setScheduledMinute}
                    cronExpression={cronExpression}
                    setCronExpression={setCronExpression}"""

new_panel = """                <AutopilotConfigPanel 
                    currentSeries={currentSeries}
                    updateSeries={updateCurrentSeries}
                    voiceList={voiceList}
                    isVoiceLoading={isVoiceLoading}
                />

                {/* Right Control Panel */}
                <AutopilotControlPanel 
                    isActive={currentSeries.is_active}
                    onClickToggleActive={onClickToggleActive}
                    platforms={currentSeries.platforms}
                    onTogglePlatform={onTogglePlatform}
                    scheduleMode={scheduleMode}
                    setScheduleMode={setScheduleMode}
                    selectedDays={selectedDays}
                    onToggleDay={onToggleDay}
                    scheduledHour={scheduledHour}
                    setScheduledHour={setScheduledHour}
                    scheduledMinute={scheduledMinute}
                    setScheduledMinute={setScheduledMinute}
                    cronExpression={currentSeries.schedule_cron}
                    setCronExpression={(expr) => updateCurrentSeries({ schedule_cron: expr })}"""

content2 = content2.replace(old_panel, new_panel)

with open(file_path2, "w") as f:
    f.write(content2)

print("Done replacing.")
