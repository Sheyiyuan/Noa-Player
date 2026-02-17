import { PlayerWorkbench } from '../features/player/ui/PlayerWorkbench';
import { TitleBar } from '../features/system/ui/TitleBar';

export function App() {
    return (
        <div className="app-shell">
            <TitleBar />
            <main className="app-content">
                <PlayerWorkbench />
            </main>
        </div>
    );
}
