import { Basecoat, Disposable, View, disposable } from '@antv/x6';

const classesNeedingStaticDispose = [
  Disposable as unknown as { dispose?: typeof disposable },
  Basecoat as unknown as { dispose?: typeof disposable },
  View as unknown as { dispose?: typeof disposable },
];

classesNeedingStaticDispose.forEach((klass) => {
  if (klass && typeof klass.dispose !== 'function') {
    klass.dispose = disposable;
  }
});
