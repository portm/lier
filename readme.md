
```
{
    # comment
    a? : int
    b : string | int
    c : string & int
    d : bool[]
    e : ({ a: int } & { a: uint })[] # comment
    f : [string, int]
    ff : [str | int]
    fff : any
    ffff : never
    fffff: oneOf(str, int)

    $definitions: {
        type1: {
            a: int
        }
        type2: {
            a: str
        }
    }

    # pattern match
    sss: match self.a {
        case { a: int } => { b: str }
        case any => { b: int }
    }

    ffffff: self.a * 2 # self(d => d * 2)

    $rest: never

    /\d+/: keyMock([1,2,3], str)

    eee: enum {
        { a: 1 }, { b: 'test' }
    }

    @mock(`a`, 'b', 'c')
    g : /regex/im

    @description(code)
    h : {
        @description
        i : {
            j: str
            @mock(2, 6, 8)
            age: int & range(1, 10) & even
            k: str.cn.province.city.street

            l: this.e[].a
            m: ({ a: int } | { b: uint })[]
            n: this.h.i[].m[1]
        }[]
    }

    a1: int
    b3: this.a1 | int # anyOf(ref('a1'), int)
    c3: this.a > 10 ? int : str
}

{ age: allOf(int, range(1, 10), even, [2, 6, 8]), arr: [anyOf(int, str)] }


{
    s: int
    b: (val) => this.s * 2 === val
}

this.e().a

{
    a: str
    /\d*/: int
    *rest: never

    b: this.$definitions.a

    $definitions: {
        a: {a: int}
    }
}

{
    @mock(1, 2)
    a?: str
}

{
    a: optional(
        mock([[1,2], [1], [2,3]], [str])
    )
}
```