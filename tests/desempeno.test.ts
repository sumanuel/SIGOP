import { describe, expect, it } from 'vitest';
import { calcularDesempeno, type ObraParaDesempeno } from '@/lib/server/contratistas/desempeno';

const d = (s: string) => new Date(s);
const obra = (o: Partial<ObraParaDesempeno> = {}): ObraParaDesempeno => ({
  culminada: true,
  fechaFinReal: d('2026-01-10'),
  fechaLimite: d('2026-02-01'),
  montoOriginal: 1000,
  montoActual: 1000,
  tuvoParalizacion: false,
  ...o,
});
const sinContrato = { montoOriginal: null, montoActual: null, fechaLimite: null };

describe('calcularDesempeno', () => {
  it('sin obras culminadas no hay puntaje', () => {
    expect(calcularDesempeno([]).puntaje).toBeNull();
    expect(calcularDesempeno([obra({ culminada: false })]).obrasEvaluadas).toBe(0);
  });

  it('una obra perfecta puntúa 100', () => {
    expect(calcularDesempeno([obra()])).toMatchObject({
      puntaje: 100,
      pctATiempo: 100,
      sobrecostoPromedioPct: 0,
      pctSinParalizacion: 100,
    });
  });

  it('pondera 50 % plazos, 30 % sobrecosto y 20 % paralizaciones', () => {
    // Tarde (0), sin sobrecosto (1), sin paralización (1) → 0.3 + 0.2
    expect(calcularDesempeno([obra({ fechaFinReal: d('2026-03-01') })]).puntaje).toBe(50);
    // A tiempo (1), sobrecosto del 100 % (0), sin paralización (1) → 0.5 + 0.2
    expect(calcularDesempeno([obra({ montoActual: 2000 })]).puntaje).toBe(70);
    // A tiempo, sin sobrecosto, con paralización (0) → 0.5 + 0.3
    expect(calcularDesempeno([obra({ tuvoParalizacion: true })]).puntaje).toBe(80);
  });

  it('el sobrecosto se promedia y se acota al 100 %', () => {
    const r = calcularDesempeno([obra({ montoActual: 1100 }), obra({ montoActual: 1000 })]);
    expect(r.sobrecostoPromedioPct).toBe(5);
    expect(calcularDesempeno([obra({ montoActual: 9000 })]).puntaje).toBe(70);
  });

  it('un contrato que baja de monto no cuenta como mérito', () => {
    expect(calcularDesempeno([obra({ montoActual: 500 })]).sobrecostoPromedioPct).toBe(0);
  });

  it('sin contrato ni fechas, el peso se reparte entre lo que sí hay', () => {
    const r = calcularDesempeno([obra(sinContrato)]);
    expect(r.pctATiempo).toBeNull();
    expect(r.sobrecostoPromedioPct).toBeNull();
    expect(r.puntaje).toBe(100);
    expect(calcularDesempeno([obra({ ...sinContrato, tuvoParalizacion: true })]).puntaje).toBe(0);
  });
});
