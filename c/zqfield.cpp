#include "zqfield.h"

ZqField::ZqField(PBigInt ap) {
    mpz_init2(tmp, 1024);
    mpz_init_set(p, *ap);
    mpz_init_set_ui(zero, 0);
    mpz_init_set_ui(one, 1);
}

ZqField::~ZqField() {
    mpz_clear(tmp);
    mpz_clear(p);
    mpz_clear(zero);
    mpz_clear(one);
}

void ZqField::add(PBigInt r, PBigInt a, PBigInt b) {
    mpz_add(tmp,*a,*b);
    mpz_fdiv_r(*r, tmp, p);
}

void ZqField::mul(PBigInt r, PBigInt a, PBigInt b) {
    mpz_mul(tmp,*a,*b);
    mpz_fdiv_r(*r, tmp, p);
}

void ZqField::lt(PBigInt r, PBigInt a, PBigInt b) {
    int c = mpz_cmp(*a, *b);
    if (c<0) {
        mpz_set(*r, one);
    } else {
        mpz_set(*r, zero);
    }
}

int ZqField::isTrue(PBigInt a) {
    return mpz_sgn(*a);
}

void ZqField::copyn(PBigInt a, PBigInt b, int n) {
    for (int i=0;i<n; i++) mpz_set(a[i], b[i]);
}