<h1 class="third" id="Lier">Lier 类型语言简介</h1>

    Lier 是一套针对 json 的类型描述系统，它用一套和 json 很像但是更简单的语法来描述 json 的格式
    在程序设计里，Lier 更像是 interface
    我们在很多协同开发时可以不依赖实例 ( json ) 而依赖其 interface 从而达到解耦的目的

<h1 class="fourth" id="lier_function">主要功能</h1>

### 文档功能

    可以直接根据定义来生成文档

### 格式的验证

    可以对数据进行验证，用于单测等各种方面

### 数据的 mock

    可以对定义进行 mock 用于并行协同开发等场景

<h1 class="fourth" id="lier_quickstart">快速上手</h1>

一个简单的例子

```json
[
    {
        "userId": 1,
        "userName": "test1",
        "displayName": "people a"
    },
    {
        "userId": 2,
        "userName": "test2"
    }
]
```

它对应的语法为

```js
{
    userId: int
    userName: str
    displayName?: str
}[]
```

```[]``` 跟在一个数据类型后表示这个类型的数组<br>
```?``` 跟在 key 后面则代表这个属性是可选的

一个树状结构的描述

```json
[
    {
        "userId": 1,
        "userName": "test1",
        "displayName": "people a",
        "childrens": [
            {
                "userId": 3,
                "userName": "test3",
                "childrens": [
                    {
                        "userId": 5,
                        "userName": "test5"
                    }
                ]
            },
            {
                "userId": 4,
                "userName": "test4",
                "displayName": "people d"
            }
        ]
    },
    {
        "userId": 2,
        "userName": "test2"
    }
]
```

它对应的语法为

```js
{
    userId: int
    userName: str
    displayName?: str
    childrens?: this[0][]
}[]
```

```this``` 代表定义的根部，即 ```{...}[]``` 所以 ```this[0]``` 可以取到第一个定义

一个多类型多数组描述

```json
[
    {
        "type": 1,
        "delete": 1
    },
    {
        "type": 2,
        "select": ["a", 10]
    },
    {
        "type": 3,
        "update": 1,
        "data": "c"
    },
    {
        "type": 3,
        "update": 1,
        "data": 15
    }
]
```

它对应的语法为

```js
({
    type: 1
    delete: int
} | {
    type: 2
    select: (int | str)[]
} | {
    type: 3
    update: int
    data: int | str
})[]
```

```a | b``` 代表 a 或者 b 都可以<br>
key 对应的 value 可以是类型也可以是具体的值，本例中 ```type``` 的 value 就是一个值

<h1 class="third" id="Type">类型</h1>

## 基础类型

    基础类型取值范围和业界同名类型一致

1. int
2. str
3. bool
4. byte
5. short
6. long
7. char
8. uint
9. float
10. double
11. number

## 特殊类型

### {} 对象类型

```json
{
    "name": "test",
    "value": 111
}
```
它对应的语法为

```js
{
    name: str
    value: int
}
```

### any

    任意类型

### never

    永远不会匹配，当被匹配的时候，就会报错
    和 throw 一个异常很像

### enum

    enum {
        value [, value ...]
    }

```json
[
    {
        "type": 1
    },
    {
        "type": 2
    },
    {
        "type": 3
    }
]
```

它对应的语法为

```js
{
    type: enum {
        1, 2, 3
    }
}[]
```

### Infinity

    正无穷

### 值类型

    1 'str' "str" true null 等支持大部分 javascript 涵盖的基础类型

### 正则类型

    /tester/i

### this 关键字

    类型的根

```json
{
    "a": 1,
    "b": {
        "c": 2
    }
}
```

它对应的语法为

```js
{
    a: int
    b: {
        c: this.a
    }
}
```

### self 关键字

    传入被验证数据的根

```json
{
    "a": 1,
    "b": {
        "c": 1
    }
}
```

它对应的语法为

```js
{
    a: int
    b: {
        c: self.a
    }
}
```

效果为对象的 ```b.c``` 属性的值和 ```a``` 的值一样

### match

    match expression {
        case expression => expression
        ...
    }

```json
{
    "type": 1,
    "value": 10
}

or

{
    "type": 2,
    "value": 100
}
```

它对应的语法为

```js
{
    type: enum {
        1, 2
    }
    value: match self.type {
        case 1 => 10
        case any => int
    }
}
```

## 表达式类型

    注：除了 | 和 & 和 ! 外，其它表达式只能和值类型一起使用

### 组

```( expression )```

### 二元表达式

1. ```|```
2. ```&```
3. ```^```
4. ```+```
5. ```-```
6. ```*```
7. ```/```
8. ```==```
9. ```===```
10. ```>```
11. ```<```
12. ```>=```
13. ```<=```
14. ```.```
15. ```%```
16. ```>>```
17. ```>>>```
18. ```<<```

### 一元表达式

1. ```!```
2. ```+```
3. ```-```
4. ```~```

### 成员访问

expression ```.``` expression<br>
expression ```[``` expression ```]```

```json
{
    "a": 2,
    "b": 4
}
```

它对应的语法为

```js
{
    a: int
    b: self.a * 2
}

or

{
    a: int
    b: self['a'] * 2
}
```

### 函数调用

expression ```(``` arguments ```)```

```json
{
    "a": 1
}

or

{
    "b": 1
}

or

{
    "c": 1
}
```

它对应的语法为

```js
oneOf({
    a: int
}, {
    b: int
}, {
    c: int
})
```

<h1 class="third" id="Key">key</h1>

    key 只在对象类型里出现

## 类型

### 基础类型

#### id

    注：id 中想包涵 $ 时请使用字符串，不然有可能和特殊类型冲突

```json
{
    "aaa": 1
}
```

它对应的语法为

```js
{
    aaa: 1
}
```

其中 aaa 的 key 类型为 ```id```

#### 数字

```json
{
    "111": 1
}
```

它对应的语法为

```js
{
    111: 1
}
```

#### 字符串

    一般字符串类型只有在 key 里包含特殊字符才需要使用，比如 开始为 $、 空格、引号等

```json
{
    "$aa' a": 1
}
```

它对应的语法为

```js
{
    "$aaa' a": 1
}
```

或者

```js
{
    '$aaa\' a': 1
}
```

```\``` 为转义字符

### 特殊类型

#### 正则

```json
{
    "a": 1,
    "b": 2
}
```

它对应的语法为

```js
{
    /^[ab]$/: int
}
```

#### $definitions

    definitions 很像变量，它在校验的时候，会被忽略 (注：忽略是指不校验 definitions 这个 key)
    这样我们就可以通过 this 关键字等特性把一些通用的东西放到这里，然后引用它

```json
{
    "a": 1,
    "b": 2
}
```

它对应的语法为

```js
{
    $definitions: int
    a: this.$definitions
    b: this.$definitions
}
```

#### $rest

    当所有 key 都没有匹配到的时候，会进入 $rest 这个 key

```json
{
    "a": 1,
    "b": 2
}
```

它对应的语法为

```js
{
    $rest: int
}
```

当你希望一个数据里只包涵定义的 key 的时候就可以用到它

```json
{
    "a": 1,
    "b": 2
}
```

它对应的语法为

```js
{
    a: int
    b: 2
    $rest: never
}
```

#### $export

    当这个 key 存在时，整个对象的类型将被视为此 key 对应的 value

```json
{
    "a": 1,
    "b": 2
}
```

它对应的语法为

```js
{
    $export: {
        a: int
        b: int
    }
}
```

## 可选

在关键字后面加 ```?``` 就代表这个 key 是可选的

<h1 class="third" id="object_decorator">对象属性装饰</h1>

```@``` 以开头只能出现在对象的属性上

### @range

    返回选择，支持 1 到 2个参数
    一个参数代表上界

```json
{
    "a": 1
}
```

它对应的语法为

```js
{
    @range(1, 10)
    a: int
}
```

### @_ 或者 @description

    属性的注释，除了文档的展示无实际效果

```json
{
    "a": 1
}
```

它对应的语法为

```js
{
    @_(' 这是一个属性')
    a: int
}
```

### mock

    存在 mock 时会优先使用 mock 的内容
    有些无法 mock 的 NP 问题也需要 mock 装饰，比如 expression & expression 这种情况

### mockKey

    存在 mockKey 时会优先使用 mockKey 的内容
    有些无法 mock 的 NP 问题也需要 mockKey 装饰，比如 $rest 正则 key 等

<h1 class="third" id="type_demo">完整的例子</h1> 

```json
{
    "regex": 2,
    "oct": 54,
    "dec": 66,
    "hex": 255,
    "int": 1,
    "str": "1",
    "bool": true,
    "byte": 1,
    "short": 1,
    "uint": 1,
    "float": 1.1,
    "enum": 2,
    "allOf": 1,
    "anyOf": "1",
    "any": {},
    "a": 1,
    "sub": [
        {
            "a": 2,
            "b": 5,
            "this": []
        }
    ],
    "match": 4
}
```

它对应的语法为

```js
{
    @mock(1)
    regex : /^\d$/
    /regex1/ : int
    @description('a')
    @description("b")
    oct : 066
    dec : 66
    hex : 0xff
    int : int
    str : str
    bool : bool
    optional? : bool
    byte : byte
    short : short
    uint : uint
    float : float
    @mock(2)
    @mock(1)
    enum : enum {
        1, 2
    }
    @mock(3)
    allOf : int & uint
    anyOf : int | str
    @_('any 匹配任何东西')
    any : any
    @_('never 不匹配任何东西')
    never? : never
    @mockKey(1)
    $rest : any
    sub : {
        a : this.int | this.str
        b : self.regex * self.regex + 1
        this : this.sub[]
    }[]
    @mock(6)
    match : match self.regex {
        case 2 => 2 * 2
        case any => 3 * 2
    }
}
```