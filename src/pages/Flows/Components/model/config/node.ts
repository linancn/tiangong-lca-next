export const node =
{
    id: '',
    shape: 'rect',
    x: 200,
    y: 100,
    width: 150,
    height: 40,
    attrs: {
        body: {
            stroke: '#8f8f8f',
            strokeWidth: 1,
            fill: '#fff',
            rx: 6,
            ry: 6,
        },
    },
    label: '',
    data: {
        label: [],
        generalComment: [],
    },
    ports: {
        groups: {
            group1: {
                position: 'top',
                attrs: {
                    circle: {
                        stroke: '#D06269',
                        strokeWidth: 1,
                        r: 4,
                        magnet: true,
                    },
                },
            },
            group2: {
                position: 'right',
                attrs: {
                    circle: {
                        stroke: '#D06269',
                        strokeWidth: 1,
                        r: 4,
                        magnet: true,
                    },
                },
            },
            group3: {
                position: 'bottom',
                attrs: {
                    circle: {
                        stroke: '#D06269',
                        strokeWidth: 1,
                        r: 4,
                        magnet: true,
                    },
                },
            },
            group4: {
                position: 'left',
                attrs: {
                    circle: {
                        stroke: '#D06269',
                        strokeWidth: 1,
                        r: 4,
                        magnet: true,
                    },
                },
            },
        },
        items: [
            { id: 'group1', group: 'group1' },
            { id: 'group2', group: 'group2' },
            { id: 'group3', group: 'group3' },
            { id: 'group4', group: 'group4' },
        ],
    },
};