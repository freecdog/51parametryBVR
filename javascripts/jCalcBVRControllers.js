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
            A: 30,                  // размеры (длина), м
            alphaz: 0.1,            // диаметр глубоких скважин, м
            Asch: 5,                // == Bk, м
            B: 34,                  // размеры (ширина), м
            dk: 0.4,                // диаметр кондиционного куска, м [0.2, 0.4]
            dz: 0,                  // диаметр заряда
            E: 1,                   // количество параллельно-сближенных скважин
            f: 7.5,                 // коэффициент крепости обрушаемых горных пород
            gamma: 3500,            // объемный вес руды в массиве, кг/м3
            H: 700,                 // глубина разработки, м
            h: 34,                  // размеры (высота), м
            //hps:
            K: 1,                   // коэффициент неоднородности массива K = [0.85, 1]
            Kn: 0.85,               // коэффициент недозаряда глубоких скважин [0.7,0.95]
            Kzzh: 0,                // F(B, deltah), коэффициент зажима
            nu: 0.33,               // коэффициент Пуассона
            PA: 0,                  // работоспособность аммонита №6 ЖВ
            PVV: 0,                 // работоспособность применяемого ВВ
            roA: 0,                 // плотность заряжения аммонита №6 ЖВ
            roVV: 0,                // плотность заряжения глубоких скважин
            //qf: 0,                  // удельный расход ВВ на отбойку, в зависимости только от f
            //S: 0,                   // площадь рудного массива в плоскости веера скважин, м2

            sposobOtboiki: 2,                   // 0 - вертикальный, 1 - на горизонт, 2 - в зажиме
            sposobRaspolozheniyaVeerov: 0,      // 0 - вертикальный, 1 - горизонтальный
            sposobRazburivaniya: 0,             // 0 - веерный, 1 - параллельный
            sposobVzryvaniyaIndex: 0,
            sposobVzryvaniya: [                 // способ коротко-замедленного взрывания
                { n: 6.105,     b: -0.629,      c: -0.53},          // одиночное
                { n: 4.74,      b: -12.975,     c: 4.253},          // многорядное
                { n: 134.321,   b: -7.356,      c: 1.192}           // порядное
            ],

            U: 0,                   // масса ВВ на 1м скважины, кг
            vertical: true,         // тип пространства
            Vo: 0,                  // меньший горизонтальный размер в плоскости обнажения
            Vs: 0,                  // толщина отбиваемого слоя
            Wf: 0                   // ЛНС на отбойку, в зависимости только от f
        };

        // PRIVATE

        function noop(){}

        function runCalculation(callback){
            callback = callback || noop;

            parameters.roo = calcroo(parameters.roVV, parameters.roA);                  // относительная плотность заряжения глубоких скважин
            parameters.KA = calcKA(parameters.PVV, parameters.PA);                      // относительная работоспособность взрывчатого вещества
            parameters.dpr = calcdpr(parameters.dz, parameters.KA, parameters.roo);     // приведенный диаметр заряда

            parameters.Kk = calcKk(parameters.vertical, parameters.nu);

            // TODO Ko принято за 1
            //parameters.Kbsh = calcKbsh(parameters.Vo, parameters.Wf, parameters.Kk, parameters.S, parameters.H, parameters.f, parameters.qf); // коэффициент, учитывающий напряженное состояние массива
            //parameters.Kzzhsh = calcKzzhsh(parameters.Kzzh);          // коэффициент, учитывающий условия отбойки в зажиме
            //parameters.Ks = calcKs(parameters.E);              // коэффициент, учитывающий количество параллельно-сближенных скважин

            //parameters.Ko = calcKo(parameters.Kbsh, parameters.Kzzhsh, parameters.Ks);  // коэффициент отбойки, комплексно характеризующий условия отбойки
            parameters.Ko = calcKo();  // коэффициент отбойки, комплексно характеризующий условия отбойки

            parameters.Co = calcCo(parameters.Ko, parameters.f);                    // показатель взрываемости в общем случае

            parameters.Cof = calcCof(parameters.f);                                 // показатель взрываемости с учетом только f

            parameters.W = calcW(parameters.K, parameters.Co, parameters.dpr);      // линия наименьшего сопротивления, м

            parameters.m = calcm(parameters.Co);                        // коэффициент сближения скважинных зарядов
            parameters.a = calca(parameters.m, parameters.W);           // расстояние между зарядами ВВ в торце скважин веера, м

            parameters.Krb = parameters.sposobRazburivaniya == 0 ? 2 : 1; // коэффициент, учитывающий способ разбуривания массива. Krb = 1 при разбуривании массива параллельными скважинами, Krb = 2 - веерами скважин
            parameters.lyambda = calclyambda(parameters.a, parameters.W, parameters.gamma, parameters.Krb);     // выход руды с 1м глубокой скважины

            // порядок значений U: 8.5,         // кг/м
            parameters.U = calcU(parameters.dz, parameters.roVV);
            parameters.q = calcq(parameters.Kn, parameters.U, parameters.lyambda);          // удельный расход на отбойку, кг/т

            parameters.R = calcR(parameters.W, parameters.K);          // длина образующей воронки выброса, м
            parameters.r = calcr(parameters.R, parameters.lyambda, parameters.gamma);          // относительное значение радиуса воронки выброса, выраженное в средних размерах куска руды, приходящегося на 1м скважины

            var sposobVzryvaniya = parameters.sposobVzryvaniya[parameters.sposobVzryvaniyaIndex];
            parameters.dsr0 = calcdsr0(parameters.r, sposobVzryvaniya.n, sposobVzryvaniya.b, sposobVzryvaniya.c);       // относительный диаметр среднего куска отбитой руды

            parameters.dsr = calcdsr(parameters.dsr0, parameters.dpr);                    // диаметр среднего куска дробленной руды, м

            parameters.betta = calcbetta(parameters.dk);                // коэффициент зависящий от dk
            parameters.alpha = calcalpha(parameters.dk);                // коэффициент зависящий от dk

            parameters.Bn = calcBn(parameters.dk, parameters.dsr, parameters.alpha, parameters.betta);

            parameters.Bk = parameters.Asch;
            parameters.BB = calcBB(parameters.sposobOtboiki, parameters.A, parameters.B, parameters.h, parameters.Bk, parameters.gamma);

            parameters.Q = calcQ(parameters.BB, parameters.q);

            parameters.Lsigma = calcLsigma(parameters.Q, parameters.Kn, parameters.U);

            parameters.Zv = calcZv(parameters.sposobRaspolozheniyaVeerov, parameters.A, parameters.Bk, parameters.W);
            parameters.Zv = Math.round(parameters.Zv + 0.6);

            parameters.Lv = calcLv(parameters.Lsigma, parameters.Zv);

            console.log("calculated successfully:", parameters);
            callback(parameters);
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
        //function calcKo(Kbsh, Kzzhsh, Ks){
        function calcKo(){
            //return Kbsh * Kzzhsh * Ks;
            return 1;
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

        function calcU(dz, roVV){
            return Math.PI * dz * dz / 4 * roVV;
        }

        function calcBn(dk, dsr, alpha, betta){
            var a = Math.pow(dsr / dk - 0.2 + (dsr/dk -0.2), betta);
            var b = Math.exp( (-alpha) * a);
            return 100 * ( 1 - b );
        }

        function calcBB(sposobOtboiki, A, B, h, Bk, gamma){   // отбойка на вертик. компенсационную щель

            if (sposobOtboiki == 0){
                return A * (B - Bk) * h * gamma;
            } else if (sposobOtboiki == 1){
                console.error("there is no hps");
                return 0;
                //return A * B * (h - hps) * gamma;
            } else if (sposobOtboiki == 2){
                return A * B * h * gamma;
            }
        }

        function calcQ(B, q){
            return B * q;
        }

        function calcLsigma(Q, Kn, U){
            return Q / (Kn * U);
        }

        function calcZv(sposobRaspolozheniyaVeerov, A, Bk, W){
            if (sposobRaspolozheniyaVeerov == 0){
                return (A - Bk) / W;
            } else {
                console.error("no hps");
                return 0;
                //return (h - hps) / W;
            }
        }

        function calcLv(Lsigma, Zv){
            return Lsigma / Zv;
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
                A: 30,          // размеры (длина), м
                alphaz: 0.1,    // диаметр глубоких скважин, м
                Asch: 5,        // == Bk, м, ширина вертикальной отрезной щели
                B: 34,          // размеры (ширина), м
                dk: 0.4,        // alphak, диаметр кондиционного куска
                dz: 0.1,        // диаметр заряда, м
                E: 1,           // количество параллельно-сближенных скважин
                f: 8,           // коэффициент крепости обрушаемых горных пород
                gamma: 3500,    // объемный вес руды в массиве, кг/м3
                H: 700,         // глубина разработки, м
                h: 34,          // размеры (высота), м
                //hps:
                K: 1,           // коэф. неоднородности массива, 0.85-1
                Kn: 0.75,       // коэф. недозаряда [0.7, 0.95]
                Kzzh: 1,        // F(B, deltah), коэффициент зажима
                nu: 0.33,       // коэффициент Пуассона
                PA: 3.6*1e-4,   // Ae, работоспособность аммонита, см3
                PVV: 3.6*1e-4,  // AVV, работоспособность применяемого ВВ, см3
                roA: 1000,      // плотность заряжения аммонита №6 ЖВ, кг/м3
                roVV: 1000,     // плотность заряжения глубоких скважин, кг/м3
                sposobOtboiki: 2,               // в зажиме
                sposobRaspolozheniyaVeerov: 0,  // вертикальный
                sposobRazburivaniya: 0,         // веерный
                sposobVzryvaniyaIndex: 2,       // порядное взрывание
                vertical: true,
                VVname: "граммонит 79/21"       // теплота взрыва, 1030 ккал/кг; скорость детонации, 3.3 км/с; работоспособность, 360 10^-6 м; плотность заряжения, 1.05 г/см3

                //PVV: 320,                     // работоспособность применяемого ВВ, см3
                //PA: 360,                      // работоспособность аммонита №6 ЖВ, см3
                //Kzzh: 1,                      // F(B, deltah), коэффициент зажима
                //Vs: 34,                       // толщина отбиваемого слоя, м
            };

            //convertUserParameters(userParameters,
            //    [
            //        ["B", "Vs"]
            //    ]
            //);

            bvrModel.init();
            //bvrModel.applyUserParameters(userParameters);
            //bvrModel.runCalculationControl();
            //bvrModel.runCalculation();

            console.log('init jCalcBVRMainController() successfully');

            $scope.parameters = userParameters;
            $scope.answer = {};
        }

        function convertUserParameters(obj, arrFromTo){
            for (var i = 0; i < arrFromTo.length; i++){
                renameProperty(obj, arrFromTo[i][0], arrFromTo[i][1]);
            }
        }
        function renameProperty(o, old_key, new_key){
            if (old_key == new_key) {
                return o;
            }
            if (o.hasOwnProperty(old_key)) {
                o[new_key] = o[old_key];
                delete o[old_key];
            }
            return o;
        }

        function Calculate(){
            bvrModel.applyUserParameters($scope.parameters);
            bvrModel.runCalculation(function(answer){
                angular.copy(answer, $scope.answer);
                //$scope.answer = answer;
            });
        }

        //$scope.$watch('parameters', function(newValue){
        //    console.log("parameters changed,", newValue);
        //}, true);

        // public
        $scope.Calculate = Calculate;


    }]);

})(angular);