import { create } from 'zustand';

type ProjectState = {
    projectName: string;
    isDefaultProject: boolean;
    isDirty: boolean;
    setProjectMeta: (payload: { projectName: string; isDefaultProject: boolean }) => void;
    setProjectDirty: (isDirty: boolean) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
    projectName: '未保存项目',
    isDefaultProject: true,
    isDirty: false,
    setProjectMeta: ({ projectName, isDefaultProject }) => set({ projectName, isDefaultProject }),
    setProjectDirty: (isDirty) => set({ isDirty }),
}));
