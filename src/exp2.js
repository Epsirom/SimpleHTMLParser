function HtmlParser(str){
    
    //使用正则表达式匹配输入字符串
    function InputLexer(str){       
        //输入的完整字符串
		var content = str;
		//当前输入位置，之前的字符被视作已消耗
        var pos = 0;
        var rspace = /\s*/m;
		
		//判断str是否匹配一个正则表达式(可能的匹配必须要从str的头部开始)
        function startWith(regex, str){
            var s = regex.exec(str);
            if(s){
                s = s.toString();
                if(str.indexOf(s)==0){
                    return s;
                }
            }
            return null;
        };
		
		//内部方法，用于消耗一个匹配的输入。
        function consume(regex){
            if(typeof(regex)=="string"){
                if(content.substr(pos,regex.length)==regex){
                    pos += regex.length;
                    return regex;
                }else{
                    return null;
                }                
            }else{
                var s = startWith(regex, content.substr(pos));
                if(s){
                    pos += s.length;
                }
                return s;
            }
        };
		
		//向前查看一个正则表达式或字符串，
		//如果当前输入位置可以匹配这个字符串或正则表达式，就返回匹配的内容。
		//例如当前输入是"abcde"，regex为/[ab]*/,则函数返回"ab"
		//    当前输入是"abcde"，regex为"abc",则函数返回"ab"
		//    当前输入是"abcde"，regex为"b"，则返回null
        function lookAhead(regex){
            if(typeof(regex)=="string"){
                //补全regex是字符串的情况，含义就是当前输入的前缀是否是regex，
				//如果是则返回regex
				//不是则返回null
				//throw "将该throw语句替换为你的代码：行号51";
                for (var i = 0, len = regex.length; i < len; ++i) {
                    if (regex[i] != content[pos + i]) {
                        return null;
                    }
                }
                return regex;
            }else{
                return startWith(regex, content.substr(pos));
            }
        };
		
		//输入一个正则表达式或字符串，
		//如果当前输入位置可以匹配这个字符串或正则表达式，就返回匹配的内容。
		//它与lookAhead的区别在于input方法要消耗输入，即：
		//  当前输入是"abcde"时，可以lookAhead("a")任意次
		//  但是只能input("a")一次，因为input过后，当前输入就剩下"bcde"了。
		//它与consume的区别是该方法忽略空格，即如果当次input之前，或者input之后，
		//  输入位置上出现了空白字符，input方法会忽略掉这些空白。
        function input(regex){
            var r = consume(regex);
            consume(rspace);
            return r;
        };
		
		//判断是否到了文档结尾
        function eof(){
            return pos>=content.length;
        };
        consume(rspace);        
        return {input:input,lookAhead:lookAhead,eof:eof};
    }
    
    var ID = /[\w-]+/;
    
    var lexer = InputLexer(str);
    
	function assert(val){
        if(!val){
            throw "Bad Html Format: "+val;
        }
    }
    
    //匹配HTML TAG
    function parseTag(){
        if(lexer.lookAhead("<!--")){
            return parseCommentTag();
        }
		if(lexer.lookAhead("<!")){
			return parseDocTypeTag();
		}
		if(lexer.lookAhead("</")){
            return;
        }
        if(!lexer.lookAhead("<")){
            return parseTextNode();
        }
        
		lexer.input("<");
        var tagname;
        assert(tagname = lexer.input(/[a-zA-Z0-9]+/));
        var attrs = [];
        //此处分析该tag中的属性，
		//注意该tag可能没有属性
		//throw "将该throw语句替换为你的代码：行号109";
        var tattr;
        while (tattr = parseAttr()) {
            attrs.push(tattr);
        }
        /*var attrname = null;
        while (attrname = lexer.input(/[a-zA-Z0-9_-]+/)) {
            if (lexer.input("=")) {
                var attrvalue = lexer.input(/("[^"]*"|'[^']*+')/);
                if (!attrvalue) {
                    throw tagname + ' has attribute ' + attrname + ' and "=" but no value.';
                }
                attrs.push({name: attrname, value: attrvalue.substr(1, attrvalue.length - 2)});
            } else {
                attrs.push({name: attrname});
            }
        }*/

        var children=[]; 
		if(lexer.lookAhead(">")){
			//一个以">"结尾的节点，我们认为它拥有子节点
			//此处为了简单起见，我们不处理HTML中某些特殊的节点，它们以">"结尾却无子节点
			//throw "将该throw语句替换为你的代码：行号113";
            lexer.input(">");
            var flag = false;
            while (!flag) {
                if (lexer.input('</')) {
                    var endtagname = lexer.input(/[a-zA-Z0-9]+/);
                    if (tagname != endtagname) {
                        throw 'tag head(' + tagname + ') and tail(' + endtagname + ') not match!';
                    }
                    assert(lexer.input('>'));
                    flag = true;
                } else {
                    children.push(parseTag());
                }
            }
        }else if(lexer.lookAhead("/>")){
			//一个以"/>"结尾的节点是没有子节点的。
			//throw "将该throw语句替换为你的代码：行号117";
            function 啥也不做哈哈哈(){};
            啥也不做哈哈哈();
		}
        return {type:"tag", name:tagname, attrs:attrs, children:children};
    }
	
    //匹配一个HTML文本节点（HTML文本节点就是一个内容字符串，例如
	//<span>abcde</span>中的"abcde"部分）
    function parseTextNode(){
        if(lexer.lookAhead("<")){
            return;
        }else{
			var content = lexer.input(/[^<]*/m);
            return {type:"text", content: content};
        }
    }
	
	function parseDocTypeTag(){
		assert(lexer.input(/<!\s*doctype/i));
		var content = lexer.input(/[^>]*/);
		assert(lexer.input(">"));
		return {type:"doctype", content:content};
	}
    
	//匹配一个注释节点
    function parseCommentTag(){
        lexer.input("<!--");
        var str = lexer.input(/.*?-->/m);
		var content = str.substr(0,str.length-3);
        return {type:"comment", content: content};
    }
    
    //匹配一个key="value"形式的属性
    function parseAttr(){
		//匹配key
        var id = lexer.input(ID);
        var value;
        if(id){
			//消耗一个等于号
            if(lexer.input("=")){
                //在此处填写你的代码，它应该分析label="value"后面的"value"，并将它的值存在value变量中
				//throw "将该throw语句替换为你的代码：行号157";
                value = lexer.input(/"[^"]*"|'[^']*'/);
                if (!value) {
                    throw 'label has "=" but no value.';
                }
                value = value.substr(1, value.length - 2);
            }
			var key=id.toLowerCase();
            return {type:"attr", key:key, value:value};
        }
    }
	
	//分析整个文档，返回文档根节点
	function parse(){
		var r=[];
		while(!lexer.eof()){
			r.push(parseTag());
		}
		var doc= {type:"document", tags:r, toString:function(){
			return visit(doc, "", toStringVisitor);
		}};
		return doc;
	}
	
	//从一个tag开始，接受一个visitor，并以这个tag为根遍历文档树。
	//visitor是一个map,key是tag类型，例如要遍历注释，需要"comment" key，
	//visitor中每一个值都是一个函数，该函数有3个参数，
	//第一个参数传入被访问的tag，
	//第二个参数传入额外信息。
	//第三个参数为遍历回调函数，它类似于visit函数，但是不需要visitor参数
	//参考下面的toStringVisitor可以更进一步了解这个函数。
	function visit(tag, a, visitor){
		return (function(){
			var v = visitor;
			function ivisit(tag, a){
				if(v[tag.type])return v[tag.type](tag, a, ivisit);
			}
			return ivisit(tag, a);
		})();
	}
	
	//这个visitor用于将文档树转化为更好看的字符串形式
	//
	var toStringVisitor = {
		//将注释节点转化为字符串
		"comment": function(tag, prefix){
			return prefix+"<!-- "+tag.content+"-->\n";
		},
		"doctype": function(tag, prefix){
			return prefix+"<!DOCTYPE  "+tag.content+">\n";
		},
		//将一个一般节点（可能带有属性和子节点）转化为字符串
		"tag":function(tag, prefix, toString){
			var str = prefix + "<"+tag.name+" ";
			for(var k in tag.attrs){
				//遍历每一个属性，将它们转化为字符串
				str += toString(tag.attrs[k], null);
			}
			if(!tag.children||tag.children.length==0){
				str+="/>\n";
			}else{
				str+=">\n";
				for(var k in tag.children){
					//遍历每一个子节点，将它们转化为字符串
					str += toString(tag.children[k], prefix+"    ");
				}
				str+=prefix+"</"+tag.name+">\n";
			}
			return str;
		},
		//将一个属性变为key=value形式的字符串
		"attr": function(tag){
			return tag.key+"=\""+tag.value+"\"";
		},
		//HTML文本节点
		"text":function(tag, prefix){
			return prefix+tag.content+"\n";
		},
		//文档根节点
		"document":function(tag, prefix, toString){
			var rstr = "";
			for(var k in tag.tags){
				//对于文档根节点，遍历下面的所有子节点
				rstr += toString(tag.tags[k], prefix);
			}
			return rstr;
		}
	};
	
	return {parse:parse, visit:visit};
};

function dowork(str){
	var parser = HtmlParser(str);
    var r = parser.parse(str);
	var baseHref;
	//这个visitor遍历文档的树结构，寻找全部的A标签，同时处理base标签把它的值写入baseHref
	var findAvisitor = {
		"tag":function(tag, args, findA){
			var hrefs=[];
			if(tag.children){
				for(var i in tag.children){
					var hs = findA(tag.children[i]);
					//递归寻找当前标签的所有子节点
					for(var k in hs){
						hrefs.push(hs[k]);
					}
				}
			}
			if(tag.name=="a"&&tag.attrs){
				//如果是A标签，应该寻找它的href属性。
				//throw "将该throw语句替换为你的代码：行号263";
                for (var k in tag.attrs) {
                    if (tag.attrs[k].key == 'href' && typeof tag.attrs[k].value == 'string') {
                        hrefs.push(tag.attrs[k].value);
                        break;
                    }
                }
			}
			if(tag.name=="base"){
				//如果是base标签，应该寻找它的文本子节点，或者href属性。
				if (tag.children) for(var i in tag.children){
					//throw "将该throw语句替换为你的代码：行号268";
                    if (tag.children[i].type == 'text') {
                        baseHref = tag.children[i].content;
                        break;
                    }
				}
				if (tag.attrs) for(var k in tag.attrs){
					//throw "将该throw语句替换为你的代码：行号271";
                    if (tag.attrs[k].key == 'href' && typeof tag.attrs[k].value == 'string') {
                        baseHref = tag.attrs[k].value;
                        break;
                    }
				}
			}
			return hrefs;
		},
		"document":function(tag,args,findA){
			var hrefs=[];
			for(var i in tag.tags){
				var hs = findA(tag.tags[i]);
				for(var k in hs){
					hrefs.push(hs[k]);
				}
			}
			return hrefs;
		}
	};
	var hrefs = parser.visit(r,null,findAvisitor);
    var basedirminlen = /:\/\//.exec(baseHref) != null ? 3 : 1;
    var basedirs = baseHref.split('/');
    for (var i in hrefs) {
        if (/:\/\//.exec(hrefs[i]) != null) {
            continue;
        }
        var dirs = hrefs[i].split('/'), tdirs, j = 0;
        if (dirs[0] == '') {
            tdirs = basedirs.slice(0, basedirminlen);
            j = 1;
        } else {
            tdirs = basedirs.slice();
        }
        for (var tlen = dirs.length; j < tlen; ++j) {
            switch (dirs[j]) {
                case '.':
                    break;
                case '..':
                    if (tdirs.length > basedirminlen) {
                        tdirs.pop();
                    }
                    break;
                default:
                    tdirs.push(dirs[j]);
                    break;
            }
        }
        hrefs[i] = tdirs.join('/');
    }
	//此时hrefs中是全部的href属性值，baseHref属性是文档的base，
	//你应该将这两者结合，生成绝对路径的数组，存放在hrefs内
	//throw "将该throw语句替换为你的代码：行号290";
	return hrefs;
}

if (typeof window === 'undefined') {
    var fs = require("fs");    
    if(process.argv[2]){
        var str = fs.readFileSync(process.argv[2]).toString();
		var r = dowork(str);
		console.info(r.toString().replace(/,/g, "\n"));
    }
}else{    
    document.close();
    document.write("<h2>输入字符串</h2><textarea id='str'></textarea><p><input type='button' id='parse' value='分析' onclick='doparse();'></input></p><p id='result'></p>");
    window.doparse = function(){
		try{
			var str = document.getElementById("str").value;
			var r = dowork(str);
			var result = document.getElementById("result");
			result.innerHTML = r.toString().replace(/,/g, "<br/>");
		}catch(e){
			alert("error: "+e);
		}
    };   
}
