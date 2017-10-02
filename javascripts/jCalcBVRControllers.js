/**
 * Created by jaric on 15.06.2017.
 */

// 13.06.2017 got papers

(function (angular){

    "use strict";

    console.log("jCalcBVRControllers", angular);

    var jCalcBVRControllers = angular.module('jCalcBVRControllers', []);

    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    var BVRModel = function(){

        // VARS


        // default values
        var parameters = {
            dz: 0,                  // диаметр заряда
            roVV: 0,                // плотность заряжения глубоких скважин
            PVV: 0,                 // работоспособность применяемого ВВ
            roA: 0,                 // плотность заряжения аммонита №6 ЖВ
            PA: 0,                  // работоспособность аммонита №6 ЖВ

            E: 1,                   // количество параллельно-сближенных скважин

            Kzzh: 0,                // F(B, deltah), коэффициент зажима

            vertical: false,        // тип пространства

            Vs: 0,                  // толщина отбиваемого слоя
            Vo: 0,                  // меньший горизонтальный размер в плоскости обнажения
            Wf: 0,                  // ЛНС на отбойку, в зависимости только от f
            qf: 0,                  // удельный расход ВВ на отбойку, в зависимости только от f
            S: 0,                   // площадь рудного массива в плоскости веера скважин, м2
            H: 700,                 // глубина разработки, м

            K: 1,                   // коэффициент неоднородности массива K = [0.85, 1]
            Krb: 2,                 // коэффициент, учитывающий способ разбуривания массива. Krb = 1 при разбуривании массива параллельными скважинами, Krb = 2 - веерами скважин
            Kn: 0.85,               // коэффициент недозаряда глубоких скважин
            U: 0,                   // масса ВВ на 1м скважины, кг

            f: 7.5,                 // коэффициент крепости обрушаемых горных пород

            sposobVzryvaniyaIndex: 0,
            sposobVzryvaniya: [     // способ коротко-замедленного взрывания
                { n: 6.105,     b: -0.629,      c: -0.53},          // одиночное
                { n: 4.74,      b: -12.975,     c: 4.253},          // многорядное
                { n: 134.321,   b: -7.356,      c: 1.192}           // порядное
            ],

            dk: 0.4,                  // диаметр кондиционного куска, м

            nu: 0.33                // коэффициент Пуассона
        };

        // PRIVATE

        function runCalculation(){
            parameters.roo = calcroo(parameters.roVV, parameters.roA);                  // относительная плотность заряжения глубоких скважин
            parameters.KA = calcKA(parameters.PVV, parameters.PA);                      // относительная работоспособность взрывчатого вещества
            parameters.dpr = calcdpr(parameters.dz, parameters.KA, parameters.roo);     // приведенный диаметр заряда


            parameters.Kk = calcKk(parameters.vertical, parameters.nu);


            parameters.Kbsh = calcKbsh(parameters.Vo, parameters.Wf, parameters.Kk, parameters.S, parameters.H, parameters.f, parameters.qf); // коэффициент, учитывающий напряженное состояние массива
            parameters.Kzzhsh = calcKzzhsh(parameters.Kzzh);          // коэффициент, учитывающий условия отбойки в зажиме
            parameters.Ks = calcKs(parameters.E);              // коэффициент, учитывающий количество параллельно-сближенных скважин

            parameters.Ko = calcKo(parameters.Kbsh, parameters.Kzzhsh, parameters.Ks);  // коэффициент отбойки, комплексно характеризующий условия отбойки


            parameters.Co = calcCo(parameters.Ko, parameters.f);                    // показатель взрываемости в общем случае

            parameters.Cof = calcCof(parameters.f);                                 // показатель взрываемости с учетом только f

            parameters.W = calcW(parameters.K, parameters.Co, parameters.dpr);      // линия наименьшего сопротивления, м

            parameters.m = calcm(parameters.Co);                        // коэффициент сближения скважинных зарядов
            parameters.a = calca(parameters.m, parameters.W);           // расстояние между зарядами ВВ в торце скважин веера, м

            parameters.lyambda = calclyambda(parameters.a, parameters.W, parameters.gamma, parameters.Krb);     // выход руды с 1м глубокой скважины


            parameters.q = calcq(parameters.Kn, parameters.U, parameters.lyambda);          // удельный расход на отбойку, кг/т

            parameters.R = calcR(parameters.W, parameters.K);          // длина образующей воронки выброса, м
            parameters.r = calcr(parameters.R, parameters.lyambda, parameters.gamma);          // относительное значение радиуса воронки выброса, выраженное в средних размерах куска руды, приходящегося на 1м скважины

            var sposobVzryvaniya = parameters.sposobVzryvaniya[parameters.sposobVzryvaniyaIndex];
            parameters.dsr0 = calcdsr0(parameters.r, sposobVzryvaniya.n, sposobVzryvaniya.b, sposobVzryvaniya.c);       // относительный диаметр среднего куска отбитой руды

            parameters.dsr = calcdsr(parameters.r);                    // диаметр среднего куска дробленной руды, м

            parameters.alpha = calcalpha(parameters.dk);                // коэффициент зависящий от dk
            parameters.betta = calcbetta(parameters.dk);                // коэффициент зависящий от dk

        }

        function calcKA(PVV, PA){
            return Math.pow(PVV / PA, 1/3);
        }
        function calcroo(roVV, roA){
            return roVV / roA;
        }
        function calcdpr(dz, KA, roo){
            return dz * KA * Math.sqrt(roo);
        }

        function calcKk(vertical, nu){
            var Kkv = Math.sqrt(nu / (1 - nu));                   // горнзонтальное, наклонное, компенсационное
            var Kkg = 1;                                                                // вертикальное

            return vertical ? Kkv : Kkg;
        }
        function calcKbsh(Vo, Wf, Kk, S, H, f, qf){
            return 1 / Math.pow( (1.5 + (0.4 * Math.exp(-Vo/Wf) - Kk * S * Math.sqrt(H) * 1e4 / f))/qf , 1/3);
        }
        function calcKzzhsh(Kzh){
            return 1 / Math.pow(Kzh, 1/3);
        }
        function calcKs(E){
            return Math.sqrt(E);
        }
        function calcKo(Kbsh, Kzzhsh, Ks){
            return Kbsh * Kzzhsh * Ks;
        }
        function calcCo(Ko, f){
            return Ko * (20 + 56 * Math.exp(-0.2 * f));
        }

        function calcCof(f){
            return calcCo(1, f);
        }

        function calcSv(B, h){
            return B * h * 1e-4;
        }

        function calcW(K, Co, dpr){
            return K * Co * dpr;
        }
        function calcm(Co){
            return 0.02 * (Co + 20);
        }
        function calca(m, W){
            return m * W;
        }
        function calclyambda(a, W, gamma, Krb){
            return a * W * gamma / Krb;
        }
        function calcq(Kn, U, lyambda){
            return Kn * U / lyambda;
        }
        function calcR(W, K){
            return W * Math.sqrt( 1 + 1/(K*K) );
        }
        function calcr(R, lyambda, gamma){
            return R / Math.pow(lyambda / gamma, 1/3);
        }
        function calcdsr0(r, n, b, c){
            return n * Math.pow(r, b) * Math.exp(c * r);
        }
        function calcdsr(dsr0, dpr){
            return dsr0 * dpr;
        }


        function calcalpha(dk){
            return 9.11 * dk * Math.exp(-11.1 * dk)
        }
        function calcbetta(dk){
            return 1.2 + 1.5 * dk;
        }
        function calcVn(alpha, dsr, dk, betta){
            return 100 * ( 1 - Math.exp(-alpha * Math.pow(dsr/dk - 0.2 + Math.abs(dsr/dk-0.2), betta) ) );
        }


        function applyUserParameters(userData){
            if (userData !== undefined && userData !== null){
                for (var param in userData){
                    if (!userData.hasOwnProperty(param)) continue;
                    parameters[param] = userData[param];
                }
            }
        }

        function runCalculationControl(){
            parameters.roo = calcroo(parameters.roVV, parameters.roA);                  // относительная плотность заряжения глубоких скважин
            parameters.KA = calcKA(parameters.PVV, parameters.PA);                      // относительная работоспособность взрывчатого вещества
            parameters.Kzzhsh = calcKzzhsh(parameters.Kzzh);          // коэффициент, учитывающий условия отбойки в зажиме

            parameters.Kk = calcKk(parameters.vertical, parameters.nu);


            var sposobVzryvaniya = parameters.sposobVzryvaniya[parameters.sposobVzryvaniyaIndex];
            parameters.dsr0 = calcdsr0(parameters.r, sposobVzryvaniya.n, sposobVzryvaniya.b, sposobVzryvaniya.c);       // относительный диаметр среднего куска отбитой руды

            parameters.Sv = calcSv(parameters.B, parameters.h);       // площадь обнажения плоскости, на которую осуществляется отбойка
        }

        // PUBLIC

        this.init = function(){
            console.log("BVRModel initialized");


        };

        this.applyUserParameters = applyUserParameters;
        this.runCalculation = runCalculation;
        this.runCalculationControl = runCalculationControl;

        this.parameters = parameters;
    };
    var bvrModel = new BVRModel();

    jCalcBVRControllers.controller('jCalcBVRMainController', ['$scope', '$window', function($scope, $window) {

        init();

        function init(){

            var userParameters = {
                vertical: true,
                Krb: 2,             // так как веерами
                sposobVzryvaniyaIndex: 2,       // порядное взрывание
                f: 7.5,
                A: 30,      // ?
                B: 34,      // ?
                h: 34,      // ?
                Asch: 5,    // ?
                H: 700,

                VVname: "граммонит 79/21",  // теплота взрыва, 1030 ккал/кг; скорость детонации, 3.3 км/с; работоспособность, 360 10^-6 м; плотность заряжения, 1.05 г/см3
                PVV: 3.6*1e-4,              // AVV
                PA: 3.6*1e-4,               // Ae


                alphaz: 0.1,    // диаметр глубоких скважин
                dk: 0.4,        // alphak, диаметр кондиционного куска
                gamma: 3.5,     // объемный вес руды в массиве, т/м3

                roVV: 1,
                roA: 1,

                Kn: 0.85,
                Kzzh: 1,

                E: 1,
                K: 1,
                nu: 0.33,
                U: 8.5      // кг/м
            };

            bvrModel.init();
            bvrModel.applyUserParameters(userParameters);
            bvrModel.runCalculationControl();

            //console.log('init successfully');
        }

    }]);

})(angular);